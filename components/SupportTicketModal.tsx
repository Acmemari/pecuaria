import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImageIcon, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createTicket,
  getTicketDetail,
  listMyTickets,
  markTicketRead,
  sendTicketMessage,
  subscribeTicketMessages,
  type SupportTicket,
  type SupportTicketAttachment,
  type SupportTicketMessage,
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

const statusLabel: Record<SupportTicket['status'], string> = {
  open: 'Em Aberto',
  done: 'Feito',
};

const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [newTicketType, setNewTicketType] = useState<SupportTicketType | null>(null);
  const [subject, setSubject] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ao fim do chat quando mensagens mudam
  useEffect(() => {
    if (detail?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detail?.messages?.length]);

  // ESC para fechar modal
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Resetar estado ao fechar
  useEffect(() => {
    if (!isOpen) {
      setActiveTicketId(null);
      setDetail(null);
      setNewTicketType(null);
      setSubject('');
      setError(null);
      resetComposer();
    }
  }, [isOpen]);

  const attachmentByMessage = useMemo(() => {
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

  const resetComposer = () => {
    setMessageInput('');
    setPastedImage(null);
    setPastedImagePreview(null);
  };

  const activeTicketIdRef = useRef(activeTicketId);
  activeTicketIdRef.current = activeTicketId;

  const loadTickets = useCallback(async () => {
    const rows = await listMyTickets();
    setTickets(rows);
    if (!activeTicketIdRef.current && rows.length > 0) {
      setActiveTicketId(rows[0].id);
    }
    if (rows.length === 0) {
      setActiveTicketId(null);
      setDetail(null);
    }
  }, []);

  const loadDetail = useCallback(
    async (ticketId: string) => {
      const data = await getTicketDetail(ticketId);
      setDetail(data as DetailState);
      await markTicketRead(ticketId);
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        await loadTickets();
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Erro ao carregar tickets.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
      void loadDetail(activeTicketId).catch((err) => {
        console.error('[SupportTicketModal] realtime refresh error:', err);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeTicketId, isOpen, loadDetail]);

  useEffect(() => {
    return () => {
      if (pastedImagePreview) {
        URL.revokeObjectURL(pastedImagePreview);
      }
    };
  }, [pastedImagePreview]);

  const handleCreateTicket = async () => {
    if (!newTicketType) return;
    setLoading(true);
    setError(null);

    try {
      const ticket = await createTicket({
        ticketType: newTicketType,
        subject,
        currentUrl: window.location.href,
      });
      setNewTicketType(null);
      setSubject('');
      await loadTickets();
      setActiveTicketId(ticket.id);
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    // Validar tamanho (5MB) e tipo antes de aceitar
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED.includes(file.type)) {
      setError('Formato de imagem inválido. Use JPEG, PNG, WEBP ou GIF.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Imagem muito grande. Máximo permitido: 5MB.');
      return;
    }

    if (pastedImagePreview) URL.revokeObjectURL(pastedImagePreview);
    setPastedImage(file);
    setPastedImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter ou Cmd+Enter para enviar
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!activeTicketId || sending) return;
    if (!messageInput.trim() && !pastedImage) return;

    setSending(true);
    setError(null);
    try {
      await sendTicketMessage(activeTicketId, {
        message: messageInput,
        imageFile: pastedImage,
      });
      resetComposer();
      await loadDetail(activeTicketId);
      await loadTickets();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-3"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Suporte interno"
    >
      <div className="bg-ai-bg border border-ai-border rounded-xl w-full max-w-5xl h-[82vh] flex overflow-hidden">
        <aside className="w-72 border-r border-ai-border bg-ai-surface/40 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ai-text">Suporte</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-ai-surface2 text-ai-subtext hover:text-ai-text"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewTicketType('erro_tecnico');
              setActiveTicketId(null);
              setDetail(null);
            }}
            className="w-full mb-3 px-2 py-1.5 text-xs rounded-md border border-ai-border text-ai-text hover:bg-ai-surface2"
          >
            + Novo chamado
          </button>

          <div className="flex-1 overflow-auto space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setActiveTicketId(ticket.id)}
                className={`w-full text-left p-2 rounded-md border text-xs ${
                  activeTicketId === ticket.id
                    ? 'border-ai-accent bg-ai-accent/10 text-ai-text'
                    : 'border-ai-border text-ai-subtext hover:bg-ai-surface2'
                }`}
              >
                <p className="font-medium truncate">{ticket.subject || ticketTypeLabel[ticket.ticket_type]}</p>
                <p className="mt-1">{ticketTypeLabel[ticket.ticket_type]}</p>
                <p className="mt-1">{statusLabel[ticket.status]}</p>
              </button>
            ))}
            {!loading && tickets.length === 0 && (
              <p className="text-xs text-ai-subtext">Nenhum ticket aberto ainda.</p>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center text-ai-subtext text-sm gap-2">
              <Loader2 size={16} className="animate-spin" />
              Carregando suporte...
            </div>
          )}

          {!loading && !activeTicketId && (
            <div className="flex-1 p-5 overflow-auto">
              <h3 className="text-sm font-semibold text-ai-text mb-2">Como podemos ajudar?</h3>
              <p className="text-xs text-ai-subtext mb-4">
                Escolha o tipo de chamado, confirme o assunto e inicie a conversa.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setNewTicketType('erro_tecnico')}
                  className={`p-3 rounded-lg border text-left ${
                    newTicketType === 'erro_tecnico' ? 'border-rose-500 bg-rose-50/40' : 'border-ai-border hover:bg-ai-surface2'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-ai-text">
                    <AlertCircle size={16} />
                    Erro Técnico
                  </div>
                  <p className="text-xs text-ai-subtext mt-1">Problemas, falhas ou comportamento inesperado.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setNewTicketType('sugestao_solicitacao')}
                  className={`p-3 rounded-lg border text-left ${
                    newTicketType === 'sugestao_solicitacao'
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-ai-border hover:bg-ai-surface2'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-ai-text">
                    <CheckCircle2 size={16} />
                    Sugestão/Solicitação
                  </div>
                  <p className="text-xs text-ai-subtext mt-1">Melhorias, ideias e pedidos de ajuste.</p>
                </button>
              </div>

              <label className="block text-xs text-ai-subtext mb-1">Assunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-ai-border bg-ai-bg px-3 py-2 text-sm text-ai-text mb-3"
                placeholder="Resumo curto do chamado"
                maxLength={200}
              />

              <button
                type="button"
                disabled={!newTicketType}
                onClick={handleCreateTicket}
                className="px-3 py-2 rounded-md text-sm bg-ai-accent text-white disabled:opacity-50"
              >
                Abrir ticket
              </button>
            </div>
          )}

          {!loading && activeTicketId && detail && (
            <>
              <div className="px-4 py-3 border-b border-ai-border">
                <p className="text-sm font-semibold text-ai-text">{detail.ticket.subject || ticketTypeLabel[detail.ticket.ticket_type]}</p>
                <p className="text-xs text-ai-subtext mt-1">
                  {ticketTypeLabel[detail.ticket.ticket_type]} • {statusLabel[detail.ticket.status]}
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                {detail.messages.map((message) => {
                  const mine = message.author_id === user.id;
                  const linkedAttachments = attachmentByMessage.get(message.id) || [];
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          mine ? 'bg-ai-accent text-white' : 'bg-ai-surface2 text-ai-text border border-ai-border'
                        }`}
                      >
                        <p className={`text-[10px] mb-1 ${mine ? 'text-white/70' : 'text-ai-subtext'}`}>
                          {message.author_name || 'Usuário'}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{message.message}</p>
                        {linkedAttachments.map((attachment) => (
                          <a key={attachment.id} href={attachment.signed_url} target="_blank" rel="noreferrer" className="block mt-2">
                            {attachment.signed_url ? (
                              <img
                                src={attachment.signed_url}
                                alt={attachment.file_name}
                                className="max-h-44 rounded border border-ai-border"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xs underline">{attachment.file_name}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-ai-border p-3">
                {pastedImagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={pastedImagePreview} alt="Prévia da imagem colada" className="max-h-24 rounded border border-ai-border" />
                    <button
                      type="button"
                      onClick={() => resetComposer()}
                      className="absolute -top-2 -right-2 rounded-full bg-black/70 text-white p-1"
                      title="Remover imagem"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem (Ctrl+V para colar print, Ctrl+Enter para enviar)"
                    className="flex-1 rounded-md border border-ai-border bg-ai-bg px-3 py-2 text-sm text-ai-text resize-none h-20"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="w-10 h-10 rounded-md bg-ai-accent text-white flex items-center justify-center disabled:opacity-50 self-end"
                    title="Enviar mensagem"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-ai-subtext">
                  <MessageCircle size={12} />
                  Conversa em tempo real com o suporte.
                  <ImageIcon size={12} className="ml-1" />
                  Cole imagem no campo para anexar.
                </div>
              </div>
            </>
          )}

          {error && <p className="px-4 py-2 text-xs text-rose-500 border-t border-ai-border">{error}</p>}
        </main>
      </div>
    </div>
  );
};

export default SupportTicketModal;
