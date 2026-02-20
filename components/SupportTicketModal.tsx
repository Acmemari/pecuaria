import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, ImageIcon, Loader2, Send, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createTicket,
  getTicketDetail,
  listMyTickets,
  markTicketRead,
  sendAIMessage,
  sendTicketMessage,
  subscribeTicketMessages,
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
  const { user } = useAuth() as any;

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const [newTicketType, setNewTicketType] = useState<SupportTicketType>('erro_tecnico');
  const [subject, setSubject] = useState('');
  const [locationArea, setLocationArea] = useState<SupportLocationArea>('main');
  const [specificScreen, setSpecificScreen] = useState('');

  const [messageInput, setMessageInput] = useState('');
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeTicketIdRef = useRef(activeTicketId);
  activeTicketIdRef.current = activeTicketId;

  useEffect(() => {
    if (detail?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detail?.messages?.length]);

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
      setSpecificScreen('');
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
        const res = await fetch('/api/support-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subject.trim(),
            ticketType: newTicketType,
            locationArea: newTicketType === 'erro_tecnico' ? locationArea : undefined,
            specificScreen: newTicketType === 'erro_tecnico' ? specificScreen : undefined,
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
  }, [subject, newTicketType, locationArea, specificScreen, showNewForm]);

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
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Erro ao carregar tickets.');
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
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Erro ao abrir ticket.');
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
        locationArea: newTicketType === 'erro_tecnico' ? locationArea : undefined,
        specificScreen: newTicketType === 'erro_tecnico' ? specificScreen : undefined,
        initialMessage: subject.trim() || undefined,
      });
      setShowNewForm(false);
      setSubject('');
      setSpecificScreen('');
      setAiSuggestion('');
      await loadTickets();
      setActiveTicketId(ticket.id);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar ticket.');
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
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED.includes(file.type)) { setError('Formato de imagem inválido.'); return; }
    if (file.size > MAX_SIZE) { setError('Imagem muito grande (máx 5MB).'); return; }
    if (pastedImagePreview) URL.revokeObjectURL(pastedImagePreview);
    setPastedImage(file);
    setPastedImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSendMessage = async () => {
    if (!activeTicketId || sending) return;
    if (!messageInput.trim() && !pastedImage) return;
    const text = messageInput.trim() || '[imagem]';
    const imageFile = pastedImage;
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
      await sendTicketMessage(activeTicketId, { message: text, imageFile });
      await loadDetail(activeTicketId);
      await loadTickets();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar mensagem.');
      setDetail((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) } : prev
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar ticket.');
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
                  {ticket.location_area && (
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                      {LOCATION_OPTIONS.find((o) => o.value === ticket.location_area)?.label || ticket.location_area}
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

              {/* Conditional fields for Erro Técnico */}
              {newTicketType === 'erro_tecnico' && (
                <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50/50 animate-fade-in">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">Detalhes do Problema</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <select
                        value={locationArea}
                        onChange={(e) => setLocationArea(e.target.value as SupportLocationArea)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                      >
                        {LOCATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={specificScreen}
                        onChange={(e) => setSpecificScreen(e.target.value)}
                        placeholder="Ex: Tela de Clientes"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        maxLength={200}
                      />
                    </div>
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
                    {detail.ticket.location_area && (
                      <> · {LOCATION_OPTIONS.find((o) => o.value === detail.ticket.location_area)?.label}</>
                    )}
                    {detail.ticket.specific_screen && (
                      <> · {detail.ticket.specific_screen}</>
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

                  if (isAI) {
                    return (
                      <div key={msg.id} className="flex justify-start gap-2 animate-fade-in">
                        <BotAvatar />
                        <div className="max-w-[70%] rounded-xl px-4 py-3 text-sm bg-white border border-blue-200 text-slate-700 shadow-sm">
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div
                        className={`max-w-[70%] rounded-xl px-4 py-3 text-sm shadow-sm ${
                          mine
                            ? 'bg-blue-600 text-white'
                            : isAgent
                              ? 'bg-amber-50 border border-amber-200 text-slate-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {!mine && (
                          <p className={`text-[10px] font-semibold mb-1 ${isAgent ? 'text-amber-600' : 'text-slate-400'}`}>
                            {isAgent ? 'Agente Técnico' : (msg.author_name || 'Usuário')}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
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
                        {/* Message status indicators for own messages */}
                        {mine && (
                          <div className="flex justify-end mt-1">
                            {msg.read_at ? (
                              <CheckCheck size={14} className="text-cyan-300" />
                            ) : (
                              <Check size={14} className="text-white/60" />
                            )}
                          </div>
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
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    placeholder="Responder ticket... (Ctrl+Enter para enviar)"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 resize-none h-[52px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sending || (!messageInput.trim() && !pastedImage)}
                    className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-all active:scale-95 duration-150"
                    title="Enviar"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
                <p className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <ImageIcon size={12} />
                  Cole imagem (Ctrl+V) para anexar.
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
