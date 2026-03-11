import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getTicketDetail,
  sendTicketMessage,
  updateTicketMessage,
  deleteTicketMessage,
  fetchMessagesSince,
  fetchUserNames,
  withSignedUrls,
  markTicketRead,
  type SupportTicketMessage,
  type SupportTicketAttachment,
  type SupportMessageAuthorType,
} from '../lib/supportTickets';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface UseSupportChatOptions {
  ticketId: string | null;
  userId: string;
  userName: string;
  authorType: SupportMessageAuthorType;
}

export interface UseSupportChatReturn {
  messages: SupportTicketMessage[];
  attachments: SupportTicketAttachment[];
  ticketDetail: SupportTicketDetail | null;
  connectionStatus: ConnectionStatus;
  typingUsers: string[];
  sendMessage: (payload: { message: string; imageFile?: File | null; replyToId?: string | null }) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  removeMessage: (messageId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  sendingIds: Set<string>;
  loadingInitial: boolean;
  reloadDetail: () => Promise<void>;
}

interface TypingEntry {
  userName: string;
  expiresAt: number;
}

const TYPING_BROADCAST_DEBOUNCE = 1000;
const TYPING_EXPIRE_MS = 3500;
const RECONNECT_DELAY = 2000;

export function useSupportChat({
  ticketId,
  userId,
  userName,
  authorType,
}: UseSupportChatOptions): UseSupportChatReturn {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [attachments, setAttachments] = useState<SupportTicketAttachment[]>([]);
  const [ticketDetail, setTicketDetail] = useState<SupportTicketDetail | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [typingMap, setTypingMap] = useState<Map<string, TypingEntry>>(new Map());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [loadingInitial, setLoadingInitial] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const userNameCacheRef = useRef<Map<string, string>>(new Map());
  const knownMsgIdsRef = useRef<Set<string>>(new Set());
  const knownAttIdsRef = useRef<Set<string>>(new Set());
  const lastMsgTimestampRef = useRef<string | null>(null);
  const lastTypingBroadcastRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const resolveAuthorName = useCallback(async (authorId: string): Promise<string> => {
    const cached = userNameCacheRef.current.get(authorId);
    if (cached) return cached;
    const nameMap = await fetchUserNames([authorId]);
    const name = nameMap[authorId] || 'Usuário';
    userNameCacheRef.current.set(authorId, name);
    return name;
  }, []);

  const addOrUpdateMessage = useCallback((msg: SupportTicketMessage) => {
    knownMsgIdsRef.current.add(msg.id);
    if (!lastMsgTimestampRef.current || msg.created_at > lastMsgTimestampRef.current) {
      lastMsgTimestampRef.current = msg.created_at;
    }
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msg.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...msg };
        return updated;
      }
      const inserted = [...prev, msg];
      inserted.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return inserted;
    });
  }, []);

  const removeMessageById = useCallback((messageId: string) => {
    knownMsgIdsRef.current.delete(messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setAttachments(prev => prev.filter(a => a.message_id !== messageId));
  }, []);

  const addOrUpdateAttachment = useCallback((att: SupportTicketAttachment) => {
    knownAttIdsRef.current.add(att.id);
    setAttachments(prev => {
      const idx = prev.findIndex(a => a.id === att.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = att;
        return updated;
      }
      return [...prev, att];
    });
  }, []);

  const loadInitialData = useCallback(async (tid: string) => {
    setLoadingInitial(true);
    try {
      const detail = await getTicketDetail(tid);
      if (!mountedRef.current) return;
      setTicketDetail(detail);
      setMessages(detail.messages);
      setAttachments(detail.attachments);

      knownMsgIdsRef.current = new Set(detail.messages.map(m => m.id));
      knownAttIdsRef.current = new Set(detail.attachments.map(a => a.id));
      const lastMsg = detail.messages[detail.messages.length - 1];
      lastMsgTimestampRef.current = lastMsg?.created_at ?? null;

      detail.messages.forEach(m => {
        userNameCacheRef.current.set(m.author_id, m.author_name || 'Usuário');
      });
      if (detail.ticket.created_by && detail.ticket.user_name) {
        userNameCacheRef.current.set(detail.ticket.created_by, detail.ticket.user_name);
      }

      void markTicketRead(tid).catch(() => {});
    } catch (err) {
      if (mountedRef.current) {
        console.error('[useSupportChat] loadInitialData error:', err);
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoadingInitial(false);
    }
  }, []);

  const reloadDetail = useCallback(async () => {
    if (!ticketId) return;
    await loadInitialData(ticketId);
  }, [ticketId, loadInitialData]);

  const syncMissedMessages = useCallback(
    async (tid: string) => {
      const since = lastMsgTimestampRef.current;
      if (!since) {
        await loadInitialData(tid);
        return;
      }
      try {
        const { messages: newMsgs, attachments: newAtts } = await fetchMessagesSince(tid, since);
        if (!mountedRef.current) return;
        newMsgs.forEach(addOrUpdateMessage);
        newAtts.forEach(addOrUpdateAttachment);
      } catch {
        await loadInitialData(tid);
      }
    },
    [loadInitialData, addOrUpdateMessage, addOrUpdateAttachment],
  );

  // -- Channel subscription --
  useEffect(() => {
    if (!ticketId || !userId) {
      setMessages([]);
      setAttachments([]);
      setTicketDetail(null);
      setConnectionStatus('connecting');
      return;
    }

    void loadInitialData(ticketId);

    const channelName = `chat:${ticketId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new_message' }, payload => {
        const msg = payload.payload?.message as SupportTicketMessage | undefined;
        if (!msg) return;
        addOrUpdateMessage(msg);
        const att = payload.payload?.attachment as SupportTicketAttachment | undefined;
        if (att) addOrUpdateAttachment(att);
      })
      .on('broadcast', { event: 'message_updated' }, payload => {
        const msg = payload.payload?.message as SupportTicketMessage | undefined;
        if (!msg) return;
        addOrUpdateMessage(msg);
      })
      .on('broadcast', { event: 'message_deleted' }, payload => {
        const msgId = payload.payload?.messageId as string | undefined;
        if (msgId) removeMessageById(msgId);
      })
      .on('broadcast', { event: 'typing' }, payload => {
        const typerUserId = payload.payload?.userId as string | undefined;
        const typerName = payload.payload?.userName as string | undefined;
        const isTyping = payload.payload?.isTyping as boolean;
        if (!typerUserId || typerUserId === userId) return;

        setTypingMap(prev => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(typerUserId, {
              userName: typerName || 'Alguém',
              expiresAt: Date.now() + TYPING_EXPIRE_MS,
            });
          } else {
            next.delete(typerUserId);
          }
          return next;
        });
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async payload => {
          const raw = payload.new as SupportTicketMessage;
          if (!raw?.id || knownMsgIdsRef.current.has(raw.id)) return;

          const authorName = await resolveAuthorName(raw.author_id);
          if (!mountedRef.current) return;
          addOrUpdateMessage({ ...raw, author_name: authorName });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async payload => {
          const raw = payload.new as SupportTicketMessage;
          if (!raw?.id) return;
          const authorName = await resolveAuthorName(raw.author_id);
          if (!mountedRef.current) return;
          addOrUpdateMessage({ ...raw, author_name: authorName });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        payload => {
          const old = payload.old as { id?: string };
          if (old?.id) removeMessageById(old.id);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_attachments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async payload => {
          const raw = payload.new as SupportTicketAttachment;
          if (!raw?.id || knownAttIdsRef.current.has(raw.id)) return;
          const [signed] = await withSignedUrls([raw]);
          if (mountedRef.current) addOrUpdateAttachment(signed);
        },
      )
      .subscribe(status => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            channel.subscribe();
            void syncMissedMessages(ticketId);
          }, RECONNECT_DELAY);
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, userId]);

  // -- Typing expiry cleaner --
  useEffect(() => {
    if (typingMap.size === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingMap(prev => {
        let changed = false;
        const next = new Map(prev);
        for (const [uid, entry] of next) {
          if (entry.expiresAt <= now) {
            next.delete(uid);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [typingMap.size]);

  const typingUsers = useMemo(() => Array.from(typingMap.values()).map(e => e.userName), [typingMap]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      const now = Date.now();
      if (isTyping && now - lastTypingBroadcastRef.current < TYPING_BROADCAST_DEBOUNCE) return;
      lastTypingBroadcastRef.current = now;

      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, userName, isTyping },
      });

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (isTyping) {
        typingTimerRef.current = setTimeout(() => {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId, userName, isTyping: false },
          });
        }, TYPING_EXPIRE_MS);
      }
    },
    [userId, userName],
  );

  const sendMessage = useCallback(
    async (payload: { message: string; imageFile?: File | null; replyToId?: string | null }) => {
      if (!ticketId) throw new Error('Nenhum ticket selecionado.');

      const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const optimisticMsg: SupportTicketMessage = {
        id: optimisticId,
        ticket_id: ticketId,
        author_id: userId,
        author_type: authorType,
        message: payload.message.trim() || '[imagem]',
        created_at: new Date().toISOString(),
        read_at: null,
        author_name: userName,
        reply_to_id: payload.replyToId ?? null,
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setSendingIds(prev => new Set(prev).add(optimisticId));

      setTyping(false);

      try {
        const result = await sendTicketMessage(ticketId, {
          message: payload.message,
          imageFile: payload.imageFile,
          authorType,
          replyToId: payload.replyToId,
        });

        const realMsg: SupportTicketMessage = {
          ...result.message,
          author_name: userName,
        };

        setMessages(prev => prev.map(m => (m.id === optimisticId ? realMsg : m)));

        if (result.attachment) {
          addOrUpdateAttachment(result.attachment);
        }

        channelRef.current?.send({
          type: 'broadcast',
          event: 'new_message',
          payload: { message: realMsg, attachment: result.attachment },
        });
      } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        throw err;
      } finally {
        setSendingIds(prev => {
          const next = new Set(prev);
          next.delete(optimisticId);
          return next;
        });
      }
    },
    [ticketId, userId, userName, authorType, setTyping, addOrUpdateAttachment],
  );

  const editMessage = useCallback(async (messageId: string, newText: string) => {
    let prevMsg: SupportTicketMessage | undefined;
    setMessages(prev => {
      prevMsg = prev.find(m => m.id === messageId);
      if (!prevMsg) return prev;
      return prev.map(m => (m.id === messageId ? { ...m, message: newText, edited_at: new Date().toISOString() } : m));
    });
    if (!prevMsg) return;

    try {
      await updateTicketMessage(messageId, newText);

      const updated = { ...prevMsg, message: newText, edited_at: new Date().toISOString() };
      channelRef.current?.send({
        type: 'broadcast',
        event: 'message_updated',
        payload: { message: updated },
      });
    } catch (err) {
      setMessages(prev => prev.map(m => (m.id === messageId && prevMsg ? prevMsg : m)));
      throw err;
    }
  }, []);

  const removeMessage = useCallback(
    async (messageId: string) => {
      let prevMsg: SupportTicketMessage | undefined;
      setMessages(prev => {
        prevMsg = prev.find(m => m.id === messageId);
        return prev;
      });
      removeMessageById(messageId);

      try {
        await deleteTicketMessage(messageId);

        channelRef.current?.send({
          type: 'broadcast',
          event: 'message_deleted',
          payload: { messageId },
        });
      } catch (err) {
        if (prevMsg) addOrUpdateMessage(prevMsg);
        throw err;
      }
    },
    [removeMessageById, addOrUpdateMessage],
  );

  return {
    messages,
    attachments,
    ticketDetail,
    connectionStatus,
    typingUsers,
    sendMessage,
    editMessage,
    removeMessage,
    setTyping,
    sendingIds,
    loadingInitial,
    reloadDetail,
  };
}
