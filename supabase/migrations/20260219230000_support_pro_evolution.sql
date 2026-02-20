-- Reaplica 023_support_pro_evolution para o sistema de migrations atual

alter table public.support_tickets
  add column if not exists location_area text,
  add column if not exists specific_screen text;

alter table public.support_tickets
  drop constraint if exists support_tickets_status_check;

alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('open', 'in_progress', 'testing', 'done'));

alter table public.support_ticket_messages
  add column if not exists author_type text not null default 'user';

alter table public.support_ticket_messages
  drop constraint if exists support_ticket_messages_author_type_check;

alter table public.support_ticket_messages
  add constraint support_ticket_messages_author_type_check
  check (author_type in ('user', 'ai', 'agent'));

alter table public.support_ticket_messages
  add column if not exists read_at timestamptz;
