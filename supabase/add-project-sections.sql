-- Выполните один раз в Supabase → SQL Editor.
-- Добавляет привязку каждого проекта к конкретному разделу типа «Проекты».
-- Существующие проекты автоматически попадут в первый проектный раздел своего портфолио.

alter table public.projects
add column if not exists section_id uuid references public.sections(id) on delete set null;

update public.projects as project
set section_id = (
  select section.id
  from public.sections as section
  where section.portfolio_id = project.portfolio_id
    and section.type = 'projects'
  order by section.sort_order, section.created_at
  limit 1
)
where project.section_id is null;

create index if not exists projects_section_order_idx
on public.projects(section_id, sort_order);

create or replace function public.validate_project_section()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.section_id is null then
    raise exception 'Для проекта необходимо выбрать раздел';
  end if;

  if not exists (
    select 1
    from public.sections as section
    where section.id = new.section_id
      and section.portfolio_id = new.portfolio_id
      and section.owner_id = new.owner_id
      and section.type = 'projects'
  ) then
    raise exception 'Выбранный раздел не принадлежит этому портфолио или имеет другой тип';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_project_section_trigger on public.projects;

create trigger validate_project_section_trigger
before insert or update of section_id, portfolio_id, owner_id
on public.projects
for each row
execute function public.validate_project_section();
