import { supabase } from './supabase';

const BUCKET_NAME = 'support-ticket-attachments';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type SupportTicketType = 'erro_tecnico' | 'sugestao_solicitacao';
export type SupportTicketStatus = 'open' | 'in_progress' | 'testing' | 'done';
export type SupportMessageAuthorType = 'user' | 'ai' | 'agent';
export type SupportLocationArea = 'main' | 'sidebar' | 'header' | 'modal' | 'other';

export interface SupportTicket {
  id: string;
  created_by: string;
  ticket_type: SupportTicketType;
  subject: string;
  status: SupportTicketStatus;
  current_url: string | null;
  location_area: SupportLocationArea | null;
  specific_screen: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  user_name?: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_type: SupportMessageAuthorType;
  message: string;
  created_at: string;
  read_at: string | null;
  author_name?: string;
}

export interface SupportTicketAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_by: string;
  created_at: string;
  signed_url?: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
  attachments: SupportTicketAttachment[];
}

interface TicketCreatePayload {
  ticketType: SupportTicketType;
  subject?: string;
  currentUrl?: string;
  initialMessage?: string;
  locationArea?: SupportLocationArea;
  specificScreen?: string;
}

interface SendTicketMessagePayload {
  message: string;
  imageFile?: File | null;
  authorType?: SupportMessageAuthorType;
}

function normalizeText(value: string | null | undefined, maxLength = 600): string {
  if (!value) return '';
  // Preserva quebras de linha do chat, mas normaliza espaços horizontais consecutivos
  return value
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

/** Escapa caracteres especiais do PostgREST para uso seguro em filtros .or() / .ilike() */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

/** Debounce simples para callbacks realtime */
function debounce(fn: () => void, delay: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

function safeLocationHref(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.href;
  }
  return '';
}

function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    throw new Error('Formato inválido. Use JPEG, PNG, WEBP ou GIF.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Imagem muito grande. Máximo permitido: 5MB.');
  }
}

function getSafeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

function buildStoragePath(ticketId: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const safe = getSafeFileName(fileName.replace(/\.[^/.]+$/, ''));
  return `${ticketId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}.${ext}`;
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error('Usuário não autenticado.');
  }
  return data.user.id;
}

async function fetchUserNames(userIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, name')
    .in('id', uniqueIds);

  if (error) {
    console.error('[supportTickets.fetchUserNames] erro:', error.message);
    return {};
  }

  return (data || []).reduce<Record<string, string>>((acc, profile: any) => {
    acc[profile.id] = profile.name || 'Usuário';
    return acc;
  }, {});
}

async function withSignedUrls(attachments: SupportTicketAttachment[]): Promise<SupportTicketAttachment[]> {
  const signed = await Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(attachment.storage_path, 3600);

      if (error) return attachment;
      return { ...attachment, signed_url: data.signedUrl };
    })
  );

  return signed;
}

export async function createTicket(payload: TicketCreatePayload): Promise<SupportTicket> {
  const createdBy = await getCurrentUserId();
  const ticketType = payload.ticketType;
  const subject = normalizeText(payload.subject || '', 200) || (ticketType === 'erro_tecnico' ? 'Erro técnico' : 'Sugestão/Solicitação');
  const currentUrl = normalizeText(payload.currentUrl || safeLocationHref(), 1200) || null;

  const locationArea = payload.locationArea || null;
  const specificScreen = normalizeText(payload.specificScreen || '', 200) || null;

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      created_by: createdBy,
      ticket_type: ticketType,
      subject,
      status: 'open',
      current_url: currentUrl,
      location_area: locationArea,
      specific_screen: specificScreen,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao criar ticket.');
  }

  if (payload.initialMessage?.trim()) {
    await sendTicketMessage(data.id, { message: payload.initialMessage.trim() });
  }

  await markTicketRead(data.id);
  return data as SupportTicket;
}

export async function listMyTickets(): Promise<SupportTicket[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('created_by', userId)
    .order('last_message_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Erro ao listar tickets.');
  }

  return (data || []) as SupportTicket[];
}

export async function listAdminTickets(params?: { status?: SupportTicketStatus; search?: string }): Promise<SupportTicket[]> {
  let query = supabase
    .from('support_tickets')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (params?.status) {
    query = query.eq('status', params.status);
  }

  if (params?.search?.trim()) {
    const term = sanitizeSearchTerm(params.search.trim());
    query = query.or(`subject.ilike.%${term}%,current_url.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Erro ao listar tickets.');
  }

  const tickets = (data || []) as SupportTicket[];
  const userNameMap = await fetchUserNames(tickets.map((ticket) => ticket.created_by));

  return tickets.map((ticket) => ({
    ...ticket,
    user_name: userNameMap[ticket.created_by] || 'Usuário',
  }));
}

export async function getTicketDetail(ticketId: string): Promise<SupportTicketDetail> {
  if (!ticketId) throw new Error('Ticket inválido.');

  const [{ data: ticket, error: ticketError }, { data: messages, error: messagesError }, { data: attachments, error: attachmentsError }] =
    await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', ticketId).single(),
      supabase.from('support_ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
      supabase.from('support_ticket_attachments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    ]);

  if (ticketError || !ticket) throw new Error(ticketError?.message || 'Ticket não encontrado.');
  if (messagesError) throw new Error(messagesError.message || 'Erro ao carregar mensagens.');
  if (attachmentsError) throw new Error(attachmentsError.message || 'Erro ao carregar anexos.');

  const baseMessages = (messages || []) as SupportTicketMessage[];
  const baseAttachments = (attachments || []) as SupportTicketAttachment[];
  const userNameMap = await fetchUserNames([
    ticket.created_by,
    ...baseMessages.map((message) => message.author_id),
  ]);

  const signedAttachments = await withSignedUrls(baseAttachments);

  return {
    ticket: {
      ...(ticket as SupportTicket),
      user_name: userNameMap[ticket.created_by] || 'Usuário',
    },
    messages: baseMessages.map((message) => ({
      ...message,
      author_name: userNameMap[message.author_id] || 'Usuário',
    })),
    attachments: signedAttachments,
  };
}

export async function uploadTicketAttachment(ticketId: string, file: File, messageId?: string): Promise<SupportTicketAttachment> {
  const userId = await getCurrentUserId();
  validateImageFile(file);

  const storagePath = buildStoragePath(ticketId, file.name || 'imagem');

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message || 'Erro ao enviar imagem.');
  }

  const { data, error } = await supabase
    .from('support_ticket_attachments')
    .insert({
      ticket_id: ticketId,
      message_id: messageId || null,
      storage_path: storagePath,
      file_name: file.name || 'imagem',
      mime_type: file.type || 'image/jpeg',
      file_size: file.size || 0,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(error?.message || 'Erro ao salvar anexo.');
  }

  const [attachment] = await withSignedUrls([data as SupportTicketAttachment]);
  return attachment;
}

export async function sendTicketMessage(ticketId: string, payload: SendTicketMessagePayload): Promise<SupportTicketMessage> {
  const authorId = await getCurrentUserId();
  const text = normalizeText(payload.message, 4000);

  if (!text && !payload.imageFile) {
    throw new Error('Digite uma mensagem ou anexe uma imagem.');
  }

  const { data, error } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      author_id: authorId,
      author_type: payload.authorType || 'user',
      message: text || '[imagem]',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao enviar mensagem.');
  }

  if (payload.imageFile) {
    await uploadTicketAttachment(ticketId, payload.imageFile, data.id);
  }

  return data as SupportTicketMessage;
}

export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status })
    .eq('id', ticketId);

  if (error) throw new Error(error.message || 'Erro ao atualizar status.');
}

export async function markTicketRead(ticketId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_support_ticket_read', { p_ticket_id: ticketId });
  if (error) throw new Error(error.message || 'Erro ao marcar ticket como lido.');
}

export async function getAdminUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_support_admin_unread_count');
  if (error) throw new Error(error.message || 'Erro ao carregar não lidas.');
  return Number(data || 0);
}

export async function sendAIMessage(ticketId: string, message: string): Promise<SupportTicketMessage> {
  return sendTicketMessage(ticketId, { message, authorType: 'ai' });
}

export function subscribeTicketMessages(ticketId: string, onRefresh: () => void): () => void {
  const debouncedRefresh = debounce(onRefresh, 400);

  const channel = supabase
    .channel(`support-ticket-${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      },
      () => debouncedRefresh()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_ticket_attachments',
        filter: `ticket_id=eq.${ticketId}`,
      },
      () => debouncedRefresh()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeAdminUnread(onRefresh: () => void): () => void {
  const debouncedRefresh = debounce(onRefresh, 800);

  const channel = supabase
    .channel('support-admin-unread')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_ticket_messages' },
      () => debouncedRefresh()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
      () => debouncedRefresh()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
