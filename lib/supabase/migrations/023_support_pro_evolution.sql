-- Suporte Pro evolution: conditional fields, expanded status flow, message author types

-- 1. Add location/screen fields to support_tickets
alter table public.support_tickets
  add column if not exists location_area text,
  add column if not exists specific_screen text;

-- 2. Expand status from (open, done) to (open, in_progress, testing, done)
alter table public.support_tickets
  drop constraint if exists support_tickets_status_check;

alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('open', 'in_progress', 'testing', 'done'));

-- 3. Add author_type to messages (user, ai, agent)
alter table public.support_ticket_messages
  add column if not exists author_type text not null default 'user';

alter table public.support_ticket_messages
  drop constraint if exists support_ticket_messages_author_type_check;

alter table public.support_ticket_messages
  add constraint support_ticket_messages_author_type_check
  check (author_type in ('user', 'ai', 'agent'));

-- 4. Add per-message read tracking
alter table public.support_ticket_messages
  add column if not exists read_at timestamptz;

-- 5. Allow AI messages (author_id can be the admin/system user)
--    Update the insert policy to also allow admins to insert messages with author_type 'ai'
drop policy if exists "support_messages_insert" on public.support_ticket_messages;
create policy "support_messages_insert"
on public.support_ticket_messages for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (t.created_by = auth.uid() or public.is_support_admin(auth.uid()))
  )
);
