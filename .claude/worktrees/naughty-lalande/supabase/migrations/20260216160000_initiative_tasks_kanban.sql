-- Migration: add Kanban fields to initiative_tasks
-- Columns:
-- - kanban_status: A Fazer | Andamento | Pausado | Concluído
-- - kanban_order: per-column ordering

alter table public.initiative_tasks
  add column if not exists kanban_status text not null default 'A Fazer',
  add column if not exists kanban_order int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'initiative_tasks_kanban_status_check'
      and conrelid = 'public.initiative_tasks'::regclass
  ) then
    alter table public.initiative_tasks
      add constraint initiative_tasks_kanban_status_check
      check (kanban_status in ('A Fazer','Andamento','Pausado','Concluído'));
  end if;
end $$;

-- Keep all existing tasks in A Fazer (per product decision)
update public.initiative_tasks
set kanban_status = 'A Fazer'
where kanban_status is null or kanban_status = '';

-- Initialize kanban_order from existing sort_order where possible
update public.initiative_tasks
set kanban_order = sort_order
where kanban_order = 0 and sort_order is not null;

create index if not exists initiative_tasks_kanban_idx
  on public.initiative_tasks (milestone_id, kanban_status, kanban_order);

