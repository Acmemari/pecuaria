import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, ExternalLink, Loader2, MapPin, MessageSquare, Paperclip, Reply, Search, Send, X } from 'lucide-react';
import {
  getTicketDetail,
  listAdminTickets,
  markTicketRead,
  sendAIMessage,
  sendTicketMessage,
  subscribeAdminUnread,
  subscribeTicketMessages,
  updateTicketStatus,
  type SupportTicket,
  type SupportTicketAttachment,
  type SupportTicketDetail,
  type SupportTicketMessage,
  type SupportTicketStatus,
} from '../lib/supportTickets';

const LOCATION_LABELS: Record<string, string> = {
  main: 'Painel Principal',
  sidebar: 'Barra Lateral',
  header: 'Cabeçalho',
  modal: 'Modal/Dialog',
  other: 'Outro',
};

const statusOptions: Array<{ value: 'all' | SupportTicketStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em Aberto' },
  { value: 'in_progress', label: 'Atendimento' },
  { value: 'testing', label: 'Em Teste' },
  { value: 'done', label: 'Feito' },
];

const typeLabel: Record<SupportTicket['ticket_type'], string> = {
  erro_tecnico: 'Erro Técnico',
  sugestao_solicitacao: 'Sugestão/Solicitação',
};

const statusConfig: Record<SupportTicketStatus, { label: string; className: string }> = {
  open: { label: 'Em Aberto', className: 'border-amber-400 bg-amber-50 text-amber-800' },
  in_progress: { label: 'Em Atendimento', className: 'border-blue-400 bg-blue-50 text-blue-800' },
  testing: { label: 'Em Teste', className: 'border-purple-400 bg-purple-50 text-purple-800' },
  done: { label: 'Feito', className: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
};

const statusBadge: Record<SupportTicketStatus, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  testing: 'bg-purple-100 text-purple-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Formato inválido. Use JPEG, PNG, WEBP ou GIF.';
  if (file.size > MAX_IMAGE_SIZE) return 'Imagem muito grande (máx 5MB).';
  return null;
}

const BotAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
      <rect x="3" y="5" width="10" height="8" rx="2" />
      <rect x="5" y="2" width="6" height="4" rx="1" />
      <circle cx="6" cy="9" r="1" />
      <circle cx="10" cy="9" r="1" />
    </svg>
  </div>
);

const SupportTicketsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all');
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [replyingTo, setReplyingTo] = useState<SupportTicketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const selectedTicketIdRef = useRef(selectedTicketId);
  selectedTicketIdRef.current = selectedTicketId;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (detail?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detail?.messages?.length]);

  useEffect(() => {
    setReplyingTo(null);
  }, [selectedTicketId]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listAdminTickets({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
      });
      setTickets(rows);
      if (!selectedTicketIdRef.current && rows.length > 0) {
        setSelectedTicketId(rows[0].id);
      }
      if (rows.length === 0) {
        setSelectedTicketId(null);
        setDetail(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao listar tickets.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  const loadDetail = useCallback(async (ticketId: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await getTicketDetail(ticketId);
      setDetail(data);
      await markTicketRead(ticketId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar detalhe do ticket.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) return;
    void loadDetail(selectedTicketId);
    const unsubscribe = subscribeTicketMessages(selectedTicketId, () => {
      void loadDetail(selectedTicketId);
      void loadTickets();
    });
    return () => { unsubscribe(); };
  }, [loadDetail, loadTickets, selectedTicketId]);

  useEffect(() => {
    const unsubscribe = subscribeAdminUnread(() => { void loadTickets(); });
    return () => { unsubscribe(); };
  }, [loadTickets]);

  useEffect(() => {
    return () => {
      if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
    };
  }, [replyImagePreview]);

  const resetReplyComposer = () => {
    setReply('');
    setReplyingTo(null);
    setReplyImage(null);
    setReplyImagePreview(null);
  };

  const handleReplyPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []) as DataTransferItem[];
    const imageItem = items.find((i: DataTransferItem) => i.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
    setReplyImage(file);
    setReplyImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleReplyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
    setReplyImage(file);
    setReplyImagePreview(URL.createObjectURL(file));
    setError(null);
    e.target.value = '';
  };

  const attachmentsByMessage = useMemo(() => {
    const map = new Map<string, SupportTicketAttachment[]>();
    if (!detail?.attachments) return map;
    detail.attachments.forEach((att) => {
      if (!att.message_id) return;
      const current = map.get(att.message_id) || [];
      current.push(att);
      map.set(att.message_id, current);
    });
    return map;
  }, [detail?.attachments]);

  const handleReply = async () => {
    if (!selectedTicketId || saving) return;
    const text = reply.trim();
    const imageFile = replyImage;
    if (!text && !imageFile) return;
    const replyToId = replyingTo?.id ?? null;
    setSaving(true);
    setError(null);
    resetReplyComposer();

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: SupportTicketMessage = {
      id: optimisticId,
      ticket_id: selectedTicketId,
      author_id: '',
      author_type: 'agent',
      message: text || '[imagem]',
      created_at: new Date().toISOString(),
      read_at: null,
      author_name: 'Agente Técnico',
      reply_to_id: replyToId,
    };

    setDetail((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, optimisticMessage] }
        : prev
    );

    try {
      await sendTicketMessage(selectedTicketId, { message: text || '[imagem]', imageFile, authorType: 'agent', replyToId });
      await loadDetail(selectedTicketId);
      await loadTickets();
    } catch (err: any) {
      setError(err?.message || 'Erro ao responder ticket.');
      setDetail((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) } : prev
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const ta = e.target as HTMLTextAreaElement;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        const newVal = val.slice(0, start) + '\n' + val.slice(end);
        setReply(newVal);
        setTimeout(() => ta.setSelectionRange(start + 1, start + 1), 0);
        return;
      }
      e.preventDefault();
      void handleReply();
    }
  };

  const canSendReply = reply.trim() || replyImage;

  const handleStatusChange = async (status: SupportTicketStatus) => {
    if (!selectedTicketId) return;
    setSaving(true);
    setError(null);
    try {
      await updateTicketStatus(selectedTicketId, status);

      if (status === 'testing') {
        await sendAIMessage(
          selectedTicketId,
          'Uma correção foi aplicada e o chamado está em fase de teste. Por favor, verifique se o problema foi resolvido e aprove ou recuse a solução.'
        );
      }

      await loadDetail(selectedTicketId);
      await loadTickets();
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar status.');
    } finally {
      setSaving(false);
    }
  };

  const showDetailMobile = selectedTicketId && detail;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold text-slate-800">Tickets de suporte</h2>
        <p className="text-xs text-slate-500 mt-0.5">Gerencie chamados internos e responda em tempo real.</p>
      </div>

      {error && (
        <div className="shrink-0 px-5">
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden px-5 pb-5 gap-4">

        {/* ===== LEFT: Ticket List ===== */}
        <section
          className={`border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col min-h-0 overflow-hidden
            w-full lg:w-[320px] lg:min-w-[260px] lg:max-w-[360px] shrink-0
            ${showDetailMobile ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="shrink-0 p-3 border-b border-slate-200 space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuário ou assunto"
                className="bg-transparent text-sm text-slate-700 flex-1 outline-none min-w-0 placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95 duration-150 ${
                    statusFilter === opt.value
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm gap-2">
                <Loader2 size={14} className="animate-spin" />
                Carregando...
              </div>
            ) : tickets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm px-3 text-center">
                Nenhum ticket encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tickets.map((ticket) => {
                  const badge = statusBadge[ticket.status];
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-white/80 focus:outline-none transition-colors ${
                        selectedTicketId === ticket.id ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 truncate">{ticket.user_name || 'Usuário'}</span>
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badge}`}>
                          {statusConfig[ticket.status].label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{typeLabel[ticket.ticket_type]}</p>
                      <p className="text-xs text-slate-600 truncate mt-0.5">{ticket.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(ticket.last_message_at || ticket.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===== RIGHT: Ticket Detail ===== */}
        <section
          className={`border border-slate-200 rounded-xl bg-white min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden
            ${showDetailMobile ? 'flex' : 'hidden lg:flex'}`}
        >
          {!selectedTicketId || !detail ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm gap-2">
              <MessageSquare size={15} />
              Selecione um ticket para ver os detalhes.
            </div>
          ) : (
            <>
              {/* Ticket header */}
              <div className="shrink-0 p-4 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      className="lg:hidden text-xs text-blue-600 hover:underline mb-1"
                    >
                      ← Voltar à lista
                    </button>
                    <p className="text-sm font-bold text-slate-800 truncate">{detail.ticket.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {detail.ticket.user_name || 'Usuário'} · {typeLabel[detail.ticket.ticket_type]}
                    </p>
                    {(detail.ticket.location_area || detail.ticket.specific_screen) && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin size={10} className="shrink-0" />
                        {detail.ticket.location_area && LOCATION_LABELS[detail.ticket.location_area]}
                        {detail.ticket.specific_screen && <> · {detail.ticket.specific_screen}</>}
                      </p>
                    )}
                    {detail.ticket.current_url && (
                      <a
                        href={detail.ticket.current_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1 max-w-full"
                        title={detail.ticket.current_url}
                      >
                        <ExternalLink size={10} className="shrink-0" />
                        <span className="truncate">{detail.ticket.current_url}</span>
                      </a>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {(['open', 'in_progress', 'testing', 'done'] as SupportTicketStatus[]).map((s) => {
                      const cfg = statusConfig[s];
                      const isActive = detail.ticket.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={saving}
                          onClick={() => handleStatusChange(s)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all active:scale-95 duration-150 ${
                            isActive ? cfg.className : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {detail.messages.map((msg) => {
                  const linked = attachmentsByMessage.get(msg.id) || [];
                  const isAI = msg.author_type === 'ai';
                  const isAgent = msg.author_type === 'agent';
                  const isUser = msg.author_type === 'user';
                  const repliedMsg = msg.reply_to_id
                    ? detail.messages.find((m) => m.id === msg.reply_to_id)
                    : null;
                  const quotedText = repliedMsg
                    ? (repliedMsg.message.length > 60
                        ? repliedMsg.message.slice(0, 60).trim() + '...'
                        : repliedMsg.message)
                    : null;

                  if (isAI) {
                    return (
                      <div key={msg.id} className="flex items-start gap-2 animate-fade-in group">
                        <BotAvatar />
                        <div className="max-w-[75%] rounded-xl px-4 py-2.5 text-sm bg-white border border-blue-200 text-slate-700 shadow-sm relative">
                          {msg.reply_to_id && (
                            <div className="mb-2 pl-2 border-l-2 border-blue-300 text-xs text-slate-500">
                              <p className="font-medium text-slate-600">
                                {repliedMsg?.author_type === 'ai'
                                  ? 'Assistente'
                                  : repliedMsg?.author_type === 'agent'
                                    ? 'Agente Técnico'
                                    : repliedMsg?.author_name || 'Usuário'}
                              </p>
                              <p className="truncate">{quotedText || 'Mensagem removida'}</p>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1 text-right">
                            {new Date(msg.created_at).toLocaleString('pt-BR')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setReplyingTo(msg)}
                            className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition-opacity"
                            title="Responder"
                          >
                            <Reply size={14} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                      <div
                        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm shadow-sm relative ${
                          isAgent
                            ? 'bg-amber-50 border border-amber-200 text-slate-800'
                            : isUser
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            isAgent ? 'hover:bg-amber-200' : isUser ? 'hover:bg-blue-500' : 'hover:bg-slate-200'
                          }`}
                          title="Responder"
                        >
                          <Reply
                            size={14}
                            className={isAgent ? 'text-amber-600' : isUser ? 'text-white/80' : 'text-slate-500'}
                          />
                        </button>
                        {msg.reply_to_id && (
                          <div
                            className={`mb-2 pl-2 border-l-2 ${
                              isAgent
                                ? 'border-amber-400 text-amber-800'
                                : isUser
                                  ? 'border-white/50 text-white/90'
                                  : 'border-slate-400 text-slate-600'
                            }`}
                          >
                            <p className="text-[10px] font-semibold">
                              {repliedMsg?.author_type === 'ai'
                                ? 'Assistente'
                                : repliedMsg?.author_type === 'agent'
                                  ? 'Agente Técnico'
                                  : repliedMsg?.author_name || 'Usuário'}
                            </p>
                            <p className="text-xs truncate">{quotedText || 'Mensagem removida'}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className={`text-[10px] font-semibold ${
                            isAgent ? 'text-amber-600' : isUser ? 'text-white/70' : 'text-slate-400'
                          }`}>
                            {isAgent ? 'Agente Técnico' : (msg.author_name || 'Usuário')}
                          </p>
                          <p className={`text-[10px] ${isUser ? 'text-white/50' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        {linked.map((att) => (
                          <a key={att.id} href={att.signed_url} target="_blank" rel="noreferrer" className="block mt-2">
                            {att.signed_url ? (
                              <img
                                src={att.signed_url}
                                alt={att.file_name}
                                className="max-h-52 rounded-lg border border-slate-200"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xs underline text-slate-400">{att.file_name}</span>
                            )}
                          </a>
                        ))}
                        {isUser && (
                          <div className="flex justify-end mt-1" title={msg.read_at ? 'Lido' : msg.id?.startsWith('temp-') ? 'Enviado' : 'Recebido'}>
                            {msg.read_at ? (
                              <CheckCheck size={13} className="text-cyan-400" />
                            ) : msg.id?.startsWith('temp-') ? (
                              <Check size={13} className="text-white/40" />
                            ) : (
                              <CheckCheck size={13} className="text-white/70" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply */}
              <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50">
                {replyingTo && (
                  <div className="mb-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-500">
                        Respondendo a{' '}
                        {replyingTo.author_type === 'ai'
                          ? 'Assistente'
                          : replyingTo.author_type === 'agent'
                            ? 'Agente Técnico'
                            : replyingTo.author_name || 'Usuário'}
                      </p>
                      <p className="truncate text-slate-600">
                        {replyingTo.message.length > 60
                          ? replyingTo.message.slice(0, 60).trim() + '...'
                          : replyingTo.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="shrink-0 p-1 rounded hover:bg-slate-200 text-slate-500"
                      title="Cancelar resposta"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {replyImagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={replyImagePreview} alt="Preview" className="max-h-20 rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={resetReplyComposer}
                      className="absolute -top-2 -right-2 rounded-full bg-slate-700 text-white p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReplyFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors hover:text-slate-700"
                    title="Anexar imagem"
                  >
                    <Paperclip size={20} />
                  </button>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onPaste={handleReplyPaste}
                    onKeyDown={handleReplyKeyDown}
                    placeholder="Digite ou cole imagem (Ctrl+V)... Enter para enviar, Ctrl+Enter para nova linha"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 resize-none h-[52px] min-w-0 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    disabled={saving || !canSendReply}
                    onClick={handleReply}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-all active:scale-95 duration-150 shrink-0 flex items-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Enviar</>}
                  </button>
                </div>
                <p className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <Paperclip size={12} />
                  Cole imagem (Ctrl+V) no chat ou clique em Anexar
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SupportTicketsDashboard;
