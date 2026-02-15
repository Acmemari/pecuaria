import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2, MessageSquare, Search } from 'lucide-react';
import {
  getTicketDetail,
  listAdminTickets,
  markTicketRead,
  sendTicketMessage,
  subscribeAdminUnread,
  subscribeTicketMessages,
  updateTicketStatus,
  type SupportTicket,
  type SupportTicketAttachment,
  type SupportTicketDetail,
  type SupportTicketStatus,
} from '../lib/supportTickets';

const statusOptions: Array<{ value: 'all' | SupportTicketStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em Aberto' },
  { value: 'done', label: 'Feito' },
];

const typeLabel: Record<SupportTicket['ticket_type'], string> = {
  erro_tecnico: 'Erro Técnico',
  sugestao_solicitacao: 'Sugestão/Solicitação',
};

const statusLabel: Record<SupportTicketStatus, string> = {
  open: 'Em Aberto',
  done: 'Feito',
};

const SupportTicketsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all');
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const selectedTicketIdRef = useRef(selectedTicketId);
  selectedTicketIdRef.current = selectedTicketId;

  // Debounce da busca: só refaz a query 400ms após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

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

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) return;
    void loadDetail(selectedTicketId);

    const unsubscribe = subscribeTicketMessages(selectedTicketId, () => {
      void loadDetail(selectedTicketId);
      void loadTickets();
    });

    return () => {
      unsubscribe();
    };
  }, [loadDetail, loadTickets, selectedTicketId]);

  useEffect(() => {
    const unsubscribe = subscribeAdminUnread(() => {
      void loadTickets();
    });

    return () => {
      unsubscribe();
    };
  }, [loadTickets]);

  const attachmentsByMessage = useMemo(() => {
    const map = new Map<string, SupportTicketAttachment[]>();
    if (!detail?.attachments) return map;
    detail.attachments.forEach((attachment) => {
      if (!attachment.message_id) return;
      const current = map.get(attachment.message_id) || [];
      current.push(attachment);
      map.set(attachment.message_id, current);
    });
    return map;
  }, [detail?.attachments]);

  const handleReply = async () => {
    if (!selectedTicketId || !reply.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await sendTicketMessage(selectedTicketId, { message: reply.trim() });
      setReply('');
      await loadDetail(selectedTicketId);
      await loadTickets();
    } catch (err: any) {
      setError(err?.message || 'Erro ao responder ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleReply();
    }
  };

  const handleStatusChange = async (status: SupportTicketStatus) => {
    if (!selectedTicketId) return;
    setSaving(true);
    setError(null);
    try {
      await updateTicketStatus(selectedTicketId, status);
      await loadDetail(selectedTicketId);
      await loadTickets();
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar status.');
    } finally {
      setSaving(false);
    }
  };

  /* Em telas pequenas, ao selecionar ticket mostra só o detalhe */
  const showDetailMobile = selectedTicketId && detail;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold text-ai-text">Tickets de suporte</h2>
        <p className="text-xs text-ai-subtext">Gerencie chamados internos e responda em tempo real.</p>
      </div>

      {error && (
        <div className="shrink-0 px-4">
          <p className="text-xs text-rose-500 bg-rose-50 rounded px-2 py-1">{error}</p>
        </div>
      )}

      {/* Corpo: dois painéis lado a lado */}
      <div className="flex-1 min-h-0 flex overflow-hidden px-4 pb-4 gap-4">

        {/* ===== PAINEL ESQUERDO: Lista de tickets ===== */}
        <section
          className={`border border-ai-border rounded-lg bg-ai-surface/30 flex flex-col min-h-0 overflow-hidden
            w-full lg:w-[320px] lg:min-w-[260px] lg:max-w-[360px] shrink-0
            ${showDetailMobile ? 'hidden lg:flex' : 'flex'}`}
        >
          {/* Filtros */}
          <div className="shrink-0 p-3 border-b border-ai-border space-y-2">
            <div className="flex items-center gap-2 rounded-md border border-ai-border px-2 py-1.5">
              <Search size={14} className="text-ai-subtext shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuário ou assunto"
                className="bg-transparent text-sm text-ai-text flex-1 outline-none min-w-0"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-2 py-1 rounded text-xs border ${
                    statusFilter === option.value
                      ? 'border-ai-accent bg-ai-accent/10 text-ai-accent'
                      : 'border-ai-border text-ai-subtext hover:bg-ai-surface2'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista — cards em vez de tabela */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center text-ai-subtext text-sm gap-2">
                <Loader2 size={14} className="animate-spin" />
                Carregando...
              </div>
            ) : tickets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-ai-subtext text-sm px-3 text-center">
                Nenhum ticket encontrado.
              </div>
            ) : (
              <div className="divide-y divide-ai-border/60">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-ai-surface2 focus:outline-none focus:bg-ai-surface2 transition-colors ${
                      selectedTicketId === ticket.id ? 'bg-ai-accent/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-ai-text truncate">
                        {ticket.user_name || 'Usuário'}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          ticket.status === 'open'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {statusLabel[ticket.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-ai-subtext mt-0.5">
                      {typeLabel[ticket.ticket_type]}
                    </p>
                    <p className="text-xs text-ai-text truncate mt-0.5">
                      {ticket.subject}
                    </p>
                    <p className="text-[10px] text-ai-subtext mt-0.5">
                      {new Date(ticket.last_message_at || ticket.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== PAINEL DIREITO: Detalhe do ticket ===== */}
        <section
          className={`border border-ai-border rounded-lg bg-ai-surface/30 min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden
            ${showDetailMobile ? 'flex' : 'hidden lg:flex'}`}
        >
          {!selectedTicketId || !detail ? (
            <div className="h-full flex items-center justify-center text-ai-subtext text-sm gap-2">
              <MessageSquare size={15} />
              Selecione um ticket para ver os detalhes.
            </div>
          ) : (
            <>
              {/* Cabeçalho do ticket */}
              <div className="shrink-0 p-3 border-b border-ai-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Botão voltar em mobile */}
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      className="lg:hidden text-xs text-ai-accent hover:underline mb-1"
                    >
                      ← Voltar à lista
                    </button>
                    <p className="text-sm font-semibold text-ai-text truncate">{detail.ticket.subject}</p>
                    <p className="text-xs text-ai-subtext">
                      {detail.ticket.user_name || 'Usuário'} • {typeLabel[detail.ticket.ticket_type]}
                    </p>
                    {detail.ticket.current_url && (
                      <a
                        href={detail.ticket.current_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-ai-accent hover:underline mt-1 max-w-full"
                        title={detail.ticket.current_url}
                      >
                        <ExternalLink size={10} className="shrink-0" />
                        <span className="truncate">{detail.ticket.current_url}</span>
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('open')}
                      className={`px-2 py-1 rounded text-xs border ${
                        detail.ticket.status === 'open'
                          ? 'border-amber-500 bg-amber-100/60 text-amber-800'
                          : 'border-ai-border text-ai-subtext hover:bg-ai-surface2'
                      }`}
                    >
                      Em Aberto
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('done')}
                      className={`px-2 py-1 rounded text-xs border ${
                        detail.ticket.status === 'done'
                          ? 'border-emerald-500 bg-emerald-100/70 text-emerald-800'
                          : 'border-ai-border text-ai-subtext hover:bg-ai-surface2'
                      }`}
                    >
                      Feito
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {detail.messages.map((message) => {
                  const linked = attachmentsByMessage.get(message.id) || [];
                  return (
                    <div key={message.id} className="rounded-md border border-ai-border p-2.5 bg-ai-bg/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-ai-text">{message.author_name || 'Usuário'}</p>
                        <p className="text-[11px] text-ai-subtext">
                          {new Date(message.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <p className="text-sm text-ai-text whitespace-pre-wrap break-words">{message.message}</p>
                      {linked.map((attachment) => (
                        <a key={attachment.id} href={attachment.signed_url} target="_blank" rel="noreferrer" className="block mt-2">
                          {attachment.signed_url ? (
                            <img
                              src={attachment.signed_url}
                              alt={attachment.file_name}
                              className="max-h-52 rounded border border-ai-border"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-xs underline text-ai-subtext">{attachment.file_name}</span>
                          )}
                        </a>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Responder */}
              <div className="shrink-0 p-3 border-t border-ai-border">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    placeholder="Responder ticket... (Ctrl+Enter para enviar)"
                    className="flex-1 rounded-md border border-ai-border bg-ai-bg px-3 py-2 text-sm text-ai-text resize-none h-20 min-w-0"
                  />
                  <button
                    type="button"
                    disabled={saving || !reply.trim()}
                    onClick={handleReply}
                    className="px-3 py-2 rounded bg-ai-accent text-white text-sm disabled:opacity-50 self-end shrink-0"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : 'Enviar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SupportTicketsDashboard;
