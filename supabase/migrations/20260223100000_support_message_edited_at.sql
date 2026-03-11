-- Adiciona coluna edited_at para rastrear mensagens editadas no chat de suporte
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;
