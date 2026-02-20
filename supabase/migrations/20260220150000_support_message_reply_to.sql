-- Suporte a responder mensagem específica (estilo WhatsApp)
-- Adiciona coluna reply_to_id em support_ticket_messages

alter table public.support_ticket_messages
  add column if not exists reply_to_id uuid
  references public.support_ticket_messages(id) on delete set null;

create index if not exists idx_support_messages_reply_to
  on public.support_ticket_messages(reply_to_id)
  where reply_to_id is not null;
