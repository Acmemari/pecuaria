-- Ao marcar ticket como lido por um ADMIN, atualizar read_at nas mensagens
-- de usuários/IA (não do admin) que ainda não foram lidas
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

  -- Quando um ADMIN marca o ticket como lido, preenche read_at nas mensagens
  -- de usuários (author_id != admin) que ainda não foram lidas
  if public.is_support_admin(auth.uid()) then
    update public.support_ticket_messages m
    set read_at = now()
    where m.ticket_id = p_ticket_id
      and m.author_id <> auth.uid()
      and m.read_at is null
      and m.created_at <= now();
  end if;
end;
$$;
