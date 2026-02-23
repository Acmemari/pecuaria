import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  Loader2,
  Pencil,
  Reply,
  Send,
  X,
  Home,
  FileText,
  Trash2,
  Building2,
  Users,
  FolderTree,
  LayoutList,
  Package,
  ListChecks,
  SquareCheck,
  LayoutDashboard,
  Columns,
  Paperclip,
  FolderOpen,
  Calculator,
  TrendingUp,
  GitCompare,
  Target,
  ClipboardList,
  MessageSquare,
  MessageCircle,
  Calendar,
  UsersRound,
  Settings,
  CreditCard,
  LogIn,
  KeyRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  PERMISSION_KEYS,
  PERMISSION_CATEGORY_LABELS,
  type PermissionCategory,
} from '../lib/permissions/permissionKeys';
import { useAuth } from '../contexts/AuthContext';
import {
  createTicket,
  deleteTicketMessage,
  getTicketDetail,
  listMyTickets,
  markTicketRead,
  sendAIMessage,
  sendTicketMessage,
  subscribeTicketMessages,
  updateTicketMessage,
  updateTicketStatus,
  type SupportLocationArea,
  type SupportTicket,
  type SupportTicketAttachment,
  type SupportTicketMessage,
  type SupportTicketStatus,
  type SupportTicketType,
} from '../lib/supportTickets';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DetailState = {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
  attachments: SupportTicketAttachment[];
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Formato de imagem inválido.';
  if (file.size > MAX_IMAGE_SIZE) return 'Imagem muito grande (máx 5MB).';
  return null;
}

const ticketTypeLabel: Record<SupportTicketType, string> = {
  erro_tecnico: 'Erro Técnico',
  sugestao_solicitacao: 'Sugestão/Solicitação',
};

const statusConfig: Record<SupportTicketStatus, { label: string; className: string }> = {
  open: { label: 'Em Aberto', className: 'bg-amber-100 text-amber-800' },
  in_progress: { label: 'Em Atendimento', className: 'bg-blue-100 text-blue-800' },
  testing: { label: 'Em Teste', className: 'bg-purple-100 text-purple-800' },
  done: { label: 'Feito', className: 'bg-emerald-100 text-emerald-800' },
};

const LOCATION_OPTIONS: Array<{ value: SupportLocationArea; label: string }> = [
  { value: 'main', label: 'Painel Principal (Main)' },
  { value: 'sidebar', label: 'Barra Lateral (Sidebar)' },
  { value: 'header', label: 'Cabeçalho (Header)' },
  { value: 'modal', label: 'Modal/Dialog' },
  { value: 'other', label: 'Outro' },
];

const SCREEN_ICON_MAP: Record<string, LucideIcon> = {
  Home,
  FileText,
  Trash2,
  Building2,
  Users,
  FolderTree,
  LayoutList,
  Package,
  ListChecks,
  SquareCheck,
  LayoutDashboard,
  Columns,
  Paperclip,
  FolderOpen,
  Calculator,
  TrendingUp,
  GitCompare,
  Target,
  ClipboardList,
  MessageSquare,
  MessageCircle,
  Calendar,
  UsersRound,
  Settings,
  CreditCard,
  LogIn,
  KeyRound,
};

function getScreenLabelFromKey(key: string | null): string | null {
  if (!key) return null;
  const def = PERMISSION_KEYS.find((pk) => pk.key === key);
  return def ? `${def.label} (${def.location})` : key;
}

const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v5M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SuggestionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <path d="M10 3v14M5 10l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BotAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
      <rect x="3" y="5" width="10" height="8" rx="2" />
      <rect x="5" y="2" width="6" height="4" rx="1" />
      <circle cx="6" cy="9" r="1" />
      <circle cx="10" cy="9" r="1" />
    </svg>
  </div>
);

const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const [newTicketType, setNewTicketType] = useState<SupportTicketType>('erro_tecnico');
  const [subject, setSubject] = useState('');
  const [selectedScreenKey, setSelectedScreenKey] = useState<string | null>(null);

  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<SupportTicketMessage | null>(null);
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeTicketIdRef = useRef(activeTicketId);
  activeTicketIdRef.current = activeTicketId;

  useEffect(() => {
    if (detail?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detail?.messages?.length]);

  useEffect(() => {
    setReplyingTo(null);
  }, [activeTicketId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTicketId(null);
      setDetail(null);
      setShowNewForm(false);
      setSubject('');
      setSelectedScreenKey(null);
      setAiSuggestion('');
      setError(null);
      resetComposer();
    }
  }, [isOpen]);

  // Smart AI suggestion: debounced call when subject changes
  useEffect(() => {
    if (!showNewForm || subject.trim().length < 10) {
      setAiSuggestion('');
      return;
    }

    setAiSuggestionLoading(true);
    const timer = setTimeout(async () => {
      try {
        const screenDef = selectedScreenKey ? PERMISSION_KEYS.find((pk) => pk.key === selectedScreenKey) : null;
        const res = await fetch('/api/support-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subject.trim(),
            ticketType: newTicketType,
            locationArea: newTicketType === 'erro_tecnico' && screenDef ? 'main' : undefined,
            specificScreen: newTicketType === 'erro_tecnico' && screenDef ? screenDef.label : undefined,
          }),
        });
        const data = await res.json();
        if (data.suggestion) setAiSuggestion(data.suggestion);
      } catch {
        // silently ignore suggestion errors
      } finally {
        setAiSuggestionLoading(false);
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      setAiSuggestionLoading(false);
    };
  }, [subject, newTicketType, selectedScreenKey, showNewForm]);

  const attachmentByMessage = useMemo(() => {
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

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) => t.subject.toLowerCase().includes(q) || ticketTypeLabel[t.ticket_type].toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const resetComposer = () => {
    setMessageInput('');
    setReplyingTo(null);
    setPastedImage(null);
    setPastedImagePreview(null);
  };

  const loadTickets = useCallback(async () => {
    const rows = await listMyTickets();
    setTickets(rows);
    if (!activeTicketIdRef.current && !showNewForm && rows.length > 0) {
      setActiveTicketId(rows[0].id);
    }
    if (rows.length === 0 && !showNewForm) {
      setActiveTicketId(null);
      setDetail(null);
    }
  }, [showNewForm]);

  const loadDetail = useCallback(async (ticketId: string) => {
    const data = await getTicketDetail(ticketId);
    setDetail(data as DetailState);
    await markTicketRead(ticketId);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        await loadTickets();
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar tickets.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, loadTickets]);

  useEffect(() => {
    if (!isOpen || !activeTicketId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        await loadDetail(activeTicketId);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao abrir ticket.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const unsubscribe = subscribeTicketMessages(activeTicketId, () => {
      void loadDetail(activeTicketId).catch(console.error);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [activeTicketId, isOpen, loadDetail]);

  useEffect(() => {
    return () => {
      if (pastedImagePreview) URL.revokeObjectURL(pastedImagePreview);
    };
  }, [pastedImagePreview]);

  const handleCreateTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const ticket = await createTicket({
        ticketType: newTicketType,
        subject,
        currentUrl: window.location.href,
        locationArea: newTicketType === 'erro_tecnico' && selectedScreenKey ? 'main' : undefined,
        specificScreen: newTicketType === 'erro_tecnico' ? (selectedScreenKey || undefined) : undefined,
        initialMessage: subject.trim() || undefined,
      });
      setShowNewForm(false);
      setSubject('');
      setSelectedScreenKey(null);
      setAiSuggestion('');
      await loadTickets();
      setActiveTicketId(ticket.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData?.items || []) as DataTransferItem[];
    const imageItem = items.find((i: DataTransferItem) => i.type.startsWith('image/'));
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    if (pastedImagePreview) URL.revokeObjectURL(pastedImagePreview);
    setPastedImage(file);
    setPastedImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    if (pastedImagePreview) URL.revokeObjectURL(pastedImagePreview);
    setPastedImage(file);
    setPastedImagePreview(URL.createObjectURL(file));
    setError(null);
    e.target.value = '';
  };

  const handleSendMessage = async () => {
    if (!activeTicketId || sending) return;
    if (!messageInput.trim() && !pastedImage) return;
    const text = messageInput.trim() || '[imagem]';
    const imageFile = pastedImage;
    const replyToId = replyingTo?.id ?? null;
    setSending(true);
    setError(null);
    resetComposer();

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: SupportTicketMessage = {
      id: optimisticId,
      ticket_id: activeTicketId,
      author_id: user.id,
      author_type: 'user',
      message: text,
      created_at: new Date().toISOString(),
      read_at: null,
      author_name: (user as { name?: string })?.name || 'Você',
      reply_to_id: replyToId,
    };

    setDetail((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, optimisticMessage],
          }
        : prev
    );

    try {
      await sendTicketMessage(activeTicketId, { message: text, imageFile, replyToId });
      await loadDetail(activeTicketId);
      await loadTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.');
      setDetail((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) } : prev
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart ?? 0;
        const end = ta.selectionEnd ?? 0;
        const newVal = messageInput.slice(0, start) + '\n' + messageInput.slice(end);
        setMessageInput(newVal);
        requestAnimationFrame(() => ta.setSelectionRange(start + 1, start + 1));
        return;
      }
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleHomologation = async (action: 'approve' | 'reject') => {
    if (!activeTicketId) return;
    setSending(true);
    setError(null);
    try {
      if (action === 'approve') {
        await updateTicketStatus(activeTicketId, 'done');
      } else {
        await updateTicketStatus(activeTicketId, 'open');
        await sendAIMessage(
          activeTicketId,
          'O usuário recusou a solução proposta. Por favor, forneça mais detalhes sobre o que não funcionou para que possamos ajudá-lo melhor.'
        );
      }
      await loadDetail(activeTicketId);
      await loadTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar ticket.');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !activeTicketId) return;
    const text = editingText.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      await updateTicketMessage(editingMessageId, text);
      setEditingMessageId(null);
      setEditingText('');
      await loadDetail(activeTicketId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao editar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeTicketId) return;
    setSending(true);
    setError(null);
    setDeletingMessageId(null);
    setDetail((prev) =>
      prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) } : prev
    );
    try {
      await deleteTicketMessage(messageId);
      await loadDetail(activeTicketId);
      await loadTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir mensagem.');
      await loadDetail(activeTicketId);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !user) return null;

  const showChat = activeTicketId && detail && !showNewForm;
  const showMobileDetail = showChat;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-3"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Suporte Pro"
    >
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden shadow-2xl animate-fade-in">

        {/* ===== LEFT SIDEBAR ===== */}
        <aside className={`w-56 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800">Suporte Pro</h2>
          </div>

          <button
            type="button"
            onClick={() => { setShowNewForm(true); setActiveTicketId(null); setDetail(null); }}
            className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all active:scale-95 duration-150"
          >
            + Novo chamado
          </button>

          <div className="px-3 mt-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar chamados..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto mt-2 px-2 pb-2 space-y-1">
            {filteredTickets.map((ticket) => {
              const cfg = statusConfig[ticket.status];
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => { setActiveTicketId(ticket.id); setShowNewForm(false); }}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors text-xs group ${
                    activeTicketId === ticket.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      ticket.ticket_type === 'erro_tecnico' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {ticket.ticket_type === 'erro_tecnico' ? 'ERRO TÉCNICO' : 'SUGESTÃO'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ticket.last_message_at || ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-medium text-slate-700 truncate">{ticket.subject || ticketTypeLabel[ticket.ticket_type]}</p>
                  {(ticket.specific_screen || ticket.location_area) && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                      {getScreenLabelFromKey(ticket.specific_screen) ||
                        LOCATION_OPTIONS.find((o) => o.value === ticket.location_area)?.label ||
                        ticket.location_area ||
                        ticket.specific_screen}
                    </p>
                  )}
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
            {!loading && tickets.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-6">Nenhum chamado ainda.</p>
            )}
          </div>
        </aside>

        {/* ===== RIGHT PANEL ===== */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Loading */}
          {loading && !detail && !showNewForm && (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm gap-2">
              <Loader2 size={18} className="animate-spin" />
              Carregando...
            </div>
          )}

          {/* ===== NEW TICKET FORM ===== */}
          {showNewForm && (
            <div className="flex-1 overflow-auto p-6 lg:p-10">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Novo Chamado</h3>

              {/* Type selector */}
              <div className="flex gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setNewTicketType('erro_tecnico')}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-95 duration-150 ${
                    newTicketType === 'erro_tecnico'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <ErrorIcon />
                  <span className="font-semibold text-sm">Erro Técnico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewTicketType('sugestao_solicitacao')}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all active:scale-95 duration-150 ${
                    newTicketType === 'sugestao_solicitacao'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <SuggestionIcon />
                  <span className="font-semibold text-sm">Sugestão/Solicitação</span>
                </button>
              </div>

              {/* Onde está o problema? – seleção visual (Erro Técnico) */}
              {newTicketType === 'erro_tecnico' && (
                <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50/50 animate-fade-in">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">
                    Onde está o problema? Clique na tela ou funcionalidade
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {(Object.keys(PERMISSION_CATEGORY_LABELS) as PermissionCategory[]).map(
                      (cat) => {
                        const items = PERMISSION_KEYS.filter((pk) => pk.category === cat);
                        if (items.length === 0) return null;
                        return (
                          <div key={cat}>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                              {PERMISSION_CATEGORY_LABELS[cat]}
                            </p>
                            <div className="space-y-1">
                              {items.map((pk) => {
                                const Icon = SCREEN_ICON_MAP[pk.icon] ?? FileText;
                                const selected = selectedScreenKey === pk.key;
                                return (
                                  <button
                                    key={pk.key}
                                    type="button"
                                    onClick={() => setSelectedScreenKey(selected ? null : pk.key)}
                                    className={`w-full text-left flex items-start gap-2 p-2.5 rounded-lg border transition-all ${
                                      selected
                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                  >
                                    <Icon size={16} className="shrink-0 mt-0.5 text-slate-500" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-slate-800 truncate">{pk.label}</p>
                                      <p className="text-[11px] text-slate-500 truncate">{pk.location}</p>
                                    </div>
                                    {selected && (
                                      <span className="shrink-0 text-[10px] font-semibold text-blue-600">✓</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Resumo do Assunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  placeholder="Ex: O botão de salvar não funciona"
                  maxLength={200}
                />
              </div>

              {/* AI Smart Suggestion */}
              {(aiSuggestionLoading || aiSuggestion) && (
                <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/60 animate-fade-in">
                  <BotAvatar />
                  <div className="flex-1 min-w-0">
                    {aiSuggestionLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        Pensando...
                      </div>
                    ) : (
                      <p className="text-sm text-blue-800 leading-relaxed">{aiSuggestion}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={loading || !subject.trim()}
                  onClick={handleCreateTicket}
                  className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 duration-150"
                >
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar Chamado'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); if (tickets.length > 0) setActiveTicketId(tickets[0].id); }}
                  className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-all active:scale-95 duration-150"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* ===== CHAT VIEW ===== */}
          {showChat && (
            <>
              {/* Chat header */}
              <div className="shrink-0 px-5 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => { setActiveTicketId(null); setDetail(null); }}
                    className="lg:hidden text-xs text-blue-600 hover:underline mb-1"
                  >
                    ← Voltar
                  </button>
                  <p className="text-sm font-bold text-slate-800 truncate">{detail.ticket.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ticketTypeLabel[detail.ticket.ticket_type]}
                    {(detail.ticket.specific_screen || detail.ticket.location_area) && (
                      <> · {getScreenLabelFromKey(detail.ticket.specific_screen) ||
                        LOCATION_OPTIONS.find((o) => o.value === detail.ticket.location_area)?.label ||
                        detail.ticket.location_area ||
                        detail.ticket.specific_screen}</>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[detail.ticket.status].className}`}>
                  {statusConfig[detail.ticket.status].label}
                </span>
              </div>

              {/* Homologation banner */}
              {detail.ticket.status === 'testing' && (
                <div className="shrink-0 mx-4 mt-3 p-3 rounded-xl border border-amber-300 bg-amber-50 flex items-center justify-between gap-3 animate-fade-in">
                  <p className="text-sm text-amber-800 font-medium">
                    Uma correção foi aplicada. Por favor, verifique e confirme.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleHomologation('approve')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all active:scale-95 duration-150 disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => handleHomologation('reject')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all active:scale-95 duration-150 disabled:opacity-50"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {detail.messages.map((msg) => {
                  const mine = msg.author_type === 'user' && msg.author_id === user.id;
                  const isAI = msg.author_type === 'ai';
                  const isAgent = msg.author_type === 'agent';
                  const linkedAttachments = attachmentByMessage.get(msg.id) || [];
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
                      <div key={msg.id} className="flex justify-start gap-2 animate-fade-in group">
                        <BotAvatar />
                        <div className="max-w-[70%] rounded-xl px-4 py-3 text-sm bg-white border border-blue-200 text-slate-700 shadow-sm relative">
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

                  const isEditing = editingMessageId === msg.id;
                  const isDeleting = deletingMessageId === msg.id;
                  const isTemp = msg.id?.startsWith('temp-');

                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                      <div
                        className={`max-w-[70%] rounded-xl px-4 py-3 text-sm shadow-sm relative ${
                          mine
                            ? 'bg-blue-600 text-white'
                            : isAgent
                              ? 'bg-amber-50 border border-amber-200 text-slate-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {mine && !isTemp && !isEditing && !isDeleting && (
                          <div className="absolute -left-1 top-2 -translate-x-full flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(msg)}
                              className="p-1 rounded hover:bg-slate-200"
                              title="Responder"
                            >
                              <Reply size={14} className="text-slate-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.message); setDeletingMessageId(null); }}
                              className="p-1 rounded hover:bg-slate-200"
                              title="Editar"
                            >
                              <Pencil size={14} className="text-slate-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDeletingMessageId(msg.id); setEditingMessageId(null); }}
                              className="p-1 rounded hover:bg-red-100"
                              title="Excluir"
                            >
                              <Trash2 size={14} className="text-slate-400" />
                            </button>
                          </div>
                        )}
                        {!mine && (
                          <button
                            type="button"
                            onClick={() => setReplyingTo(msg)}
                            className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                              isAgent ? 'hover:bg-amber-100' : 'hover:bg-slate-200'
                            }`}
                            title="Responder"
                          >
                            <Reply size={14} className="text-slate-500" />
                          </button>
                        )}
                        {msg.reply_to_id && (
                          <div
                            className={`mb-2 pl-2 border-l-2 ${
                              mine
                                ? 'border-white/50 text-white/90'
                                : isAgent
                                  ? 'border-amber-400 text-amber-800'
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
                        {!mine && (
                          <p className={`text-[10px] font-semibold mb-1 ${isAgent ? 'text-amber-600' : 'text-slate-400'}`}>
                            {isAgent ? 'Agente Técnico' : (msg.author_name || 'Usuário')}
                          </p>
                        )}
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleEditMessage(); }
                                if (e.key === 'Escape') { setEditingMessageId(null); setEditingText(''); }
                              }}
                              className="w-full rounded-lg border border-white/30 bg-blue-500/50 px-3 py-2 text-sm text-white placeholder:text-white/50 resize-none outline-none focus:border-white/50"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => { setEditingMessageId(null); setEditingText(''); }}
                                className="p-1 rounded hover:bg-blue-500 transition-colors"
                                title="Cancelar"
                              >
                                <X size={14} className="text-white/80" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleEditMessage()}
                                disabled={!editingText.trim() || editingText.trim() === msg.message}
                                className="p-1 rounded hover:bg-blue-500 transition-colors disabled:opacity-40"
                                title="Salvar"
                              >
                                <Check size={14} className="text-white" />
                              </button>
                            </div>
                          </div>
                        ) : isDeleting ? (
                          <div className="space-y-2">
                            <p className="whitespace-pre-wrap break-words opacity-50">{msg.message}</p>
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/20">
                              <span className="text-xs text-white/90">Excluir mensagem?</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setDeletingMessageId(null)}
                                  className="px-2 py-1 rounded text-xs font-medium hover:bg-blue-500 text-white/80 transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteMessage(msg.id)}
                                  className="px-2 py-1 rounded text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        )}
                        {linkedAttachments.map((att) => (
                          <a key={att.id} href={att.signed_url} target="_blank" rel="noreferrer" className="block mt-2">
                            {att.signed_url ? (
                              <img
                                src={att.signed_url}
                                alt={att.file_name}
                                className="max-h-44 rounded-lg border border-slate-200"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xs underline">{att.file_name}</span>
                            )}
                          </a>
                        ))}
                        {mine && (
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {msg.edited_at && (
                              <span className="text-[10px] text-white/50 italic">editado</span>
                            )}
                            <span title={msg.read_at ? 'Lido' : isTemp ? 'Enviado' : 'Recebido'}>
                              {msg.read_at ? (
                                <CheckCheck size={14} className="text-cyan-300" />
                              ) : isTemp ? (
                                <Check size={14} className="text-white/50" />
                              ) : (
                                <CheckCheck size={14} className="text-white/70" />
                              )}
                            </span>
                          </div>
                        )}
                        {!mine && msg.edited_at && (
                          <p className={`text-[10px] italic mt-1 ${isAgent ? 'text-amber-500' : 'text-slate-400'}`}>editado</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex justify-end animate-fade-in">
                    <div className="px-4 py-3 rounded-xl bg-blue-500/80 text-white text-sm flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Enviando...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-slate-200 p-3 bg-slate-50">
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
                {pastedImagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={pastedImagePreview} alt="Preview" className="max-h-20 rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={resetComposer}
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
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite ou cole imagem (Ctrl+V)... Enter para enviar, Ctrl+Enter para nova linha"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 resize-none h-[52px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors hover:text-slate-700"
                    title="Anexar imagem"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sending || (!messageInput.trim() && !pastedImage)}
                    className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-all active:scale-95 duration-150 shrink-0"
                    title="Enviar"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
                <p className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <Paperclip size={12} />
                  Cole imagem (Ctrl+V) no chat ou clique em Anexar
                </p>
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && !showNewForm && !showChat && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium">Selecione um chamado ou crie um novo</p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="shrink-0 px-5 py-2 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </main>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 shadow-sm transition-colors"
          title="Fechar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default SupportTicketModal;
