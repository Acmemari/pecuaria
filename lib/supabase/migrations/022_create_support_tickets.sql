-- Sistema de suporte interno: tickets + chat + anexos

-- Bucket privado para anexos
insert into storage.buckets (id, name, public)
values ('support-ticket-attachments', 'support-ticket-attachments', false)
on conflict (id) do nothing;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  ticket_type text not null check (ticket_type in ('erro_tecnico', 'sugestao_solicitacao')),
  subject text not null default '',
  status text not null default 'open' check (status in ('open', 'done')),
  current_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  message_id uuid references public.support_ticket_messages(id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.support_ticket_reads (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticket_id, user_id)
);

create index if not exists idx_support_tickets_created_by on public.support_tickets(created_by);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_last_message_at on public.support_tickets(last_message_at desc);
create index if not exists idx_support_messages_ticket_created_at on public.support_ticket_messages(ticket_id, created_at);
create index if not exists idx_support_attachments_ticket on public.support_ticket_attachments(ticket_id);
create index if not exists idx_support_attachments_message on public.support_ticket_attachments(message_id);
create index if not exists idx_support_reads_ticket_user on public.support_ticket_reads(ticket_id, user_id);

create or replace function public.support_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row execute procedure public.support_set_updated_at();

drop trigger if exists trg_support_reads_updated_at on public.support_ticket_reads;
create trigger trg_support_reads_updated_at
before update on public.support_ticket_reads
for each row execute procedure public.support_set_updated_at();

create or replace function public.support_update_ticket_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.support_tickets
    set last_message_at = new.created_at,
        updated_at = now()
  where id = new.ticket_id;

  return new;
end;
$$;

drop trigger if exists trg_support_message_updates_ticket on public.support_ticket_messages;
create trigger trg_support_message_updates_ticket
after insert on public.support_ticket_messages
for each row execute procedure public.support_update_ticket_last_message_at();

create or replace function public.is_support_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = uid
      and up.role = 'admin'
  );
$$;

create or replace function public.mark_support_ticket_read(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not exists (
    select 1
    from public.support_tickets t
    where t.id = p_ticket_id
      and (t.created_by = auth.uid() or public.is_support_admin(auth.uid()))
  ) then
    raise exception 'Sem permissão para marcar leitura';
  end if;

  insert into public.support_ticket_reads (ticket_id, user_id, last_read_at)
  values (p_ticket_id, auth.uid(), now())
  on conflict (ticket_id, user_id)
  do update set last_read_at = now(), updated_at = now();
end;
$$;

create or replace function public.get_support_admin_unread_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 0
    when not public.is_support_admin(auth.uid()) then 0
    else (
      select count(*)::int
      from public.support_tickets t
      where exists (
        select 1
        from public.support_ticket_messages m
        left join public.support_ticket_reads r
          on r.ticket_id = t.id
         and r.user_id = auth.uid()
        where m.ticket_id = t.id
          and m.author_id <> auth.uid()
          and m.created_at > coalesce(r.last_read_at, to_timestamp(0))
      )
    )
  end;
$$;

create or replace function public.get_support_ticket_unread_count(p_ticket_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 0
    when not exists (
      select 1
      from public.support_tickets t
      where t.id = p_ticket_id
        and (t.created_by = auth.uid() or public.is_support_admin(auth.uid()))
    ) then 0
    else (
      select count(*)::int
      from public.support_ticket_messages m
      left join public.support_ticket_reads r
        on r.ticket_id = p_ticket_id
       and r.user_id = auth.uid()
      where m.ticket_id = p_ticket_id
        and m.author_id <> auth.uid()
        and m.created_at > coalesce(r.last_read_at, to_timestamp(0))
    )
  end;
$$;

grant execute on function public.mark_support_ticket_read(uuid) to authenticated;
grant execute on function public.get_support_admin_unread_count() to authenticated;
grant execute on function public.get_support_ticket_unread_count(uuid) to authenticated;

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_attachments enable row level security;
alter table public.support_ticket_reads enable row level security;

drop policy if exists "support_tickets_select" on public.support_tickets;
create policy "support_tickets_select"
on public.support_tickets for select
using (
  created_by = auth.uid()
  or public.is_support_admin(auth.uid())
);

drop policy if exists "support_tickets_insert" on public.support_tickets;
create policy "support_tickets_insert"
on public.support_tickets for insert
with check (
  created_by = auth.uid()
);

drop policy if exists "support_tickets_update" on public.support_tickets;
create policy "support_tickets_update"
on public.support_tickets for update
using (
  created_by = auth.uid()
  or public.is_support_admin(auth.uid())
)
with check (
  created_by = auth.uid()
  or public.is_support_admin(auth.uid())
);

drop policy if exists "support_tickets_delete" on public.support_tickets;
create policy "support_tickets_delete"
on public.support_tickets for delete
using (public.is_support_admin(auth.uid()));

drop policy if exists "support_messages_select" on public.support_ticket_messages;
create policy "support_messages_select"
on public.support_ticket_messages for select
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (t.created_by = auth.uid() or public.is_support_admin(auth.uid()))
  )
);

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

drop policy if exists "support_messages_update" on public.support_ticket_messages;
create policy "support_messages_update"
on public.support_ticket_messages for update
using (
  author_id = auth.uid()
  or public.is_support_admin(auth.uid())
)
with check (
  author_id = auth.uid()
  or public.is_support_admin(auth.uid())
);

drop policy if exists "support_messages_delete" on public.support_ticket_messages;
create policy "support_messages_delete"
on public.support_ticket_messages for delete
using (
  author_id = auth.uid()
  or public.is_support_admin(auth.uid())
);

drop policy if exists "support_attachments_select" on public.support_ticket_attachments;
create policy "support_attachments_select"
on public.support_ticket_attachments for select
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_attachments.ticket_id
      and (t.created_by = auth.uid() or public.is_support_admin(auth.uid()))
  )
);

drop policy if exists "support_attachments_insert" on public.support_ticket_attachments;
create policy "support_attachments_insert"
on public.support_ticket_attachments for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_attachments.ticket_id
      and (t.created_by = auth.uid() or public.is_support_admin(auth.uid()))
  )
);

drop policy if exists "support_attachments_delete" on public.support_ticket_attachments;
create policy "support_attachments_delete"
on public.support_ticket_attachments for delete
using (
  created_by = auth.uid()
  or public.is_support_admin(auth.uid())
);

drop policy if exists "support_reads_select" on public.support_ticket_reads;
create policy "support_reads_select"
on public.support_ticket_reads for select
using (user_id = auth.uid());

drop policy if exists "support_reads_insert" on public.support_ticket_reads;
create policy "support_reads_insert"
on public.support_ticket_reads for insert
with check (user_id = auth.uid());

drop policy if exists "support_reads_update" on public.support_ticket_reads;
create policy "support_reads_update"
on public.support_ticket_reads for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "support_storage_read" on storage.objects;
create policy "support_storage_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'support-ticket-attachments'
  and exists (
    select 1
    from public.support_ticket_attachments a
    join public.support_tickets t on t.id = a.ticket_id
    where a.storage_path = storage.objects.name
      and (t.created_by = auth.uid() or public.is_support_admin(auth.uid()))
  )
);

drop policy if exists "support_storage_insert" on storage.objects;
create policy "support_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'support-ticket-attachments'
);

drop policy if exists "support_storage_delete" on storage.objects;
create policy "support_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'support-ticket-attachments'
  and (
    public.is_support_admin(auth.uid())
    or owner = auth.uid()
  )
);
