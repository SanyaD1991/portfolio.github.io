-- Добавляет изображения и привязку достижений к конкретным разделам.
-- Существующие записи сохраняются.

alter table public.achievements
  add column if not exists section_id uuid references public.sections(id) on delete set null;

alter table public.achievements
  add column if not exists image_url text;

-- Уже созданные достижения автоматически помещаются
-- в первый раздел типа «Достижения» своего портфолио.
update public.achievements a
set section_id = (
  select s.id
  from public.sections s
  where s.portfolio_id = a.portfolio_id
    and s.type = 'achievements'
  order by s.sort_order, s.created_at
  limit 1
)
where a.section_id is null
  and exists (
    select 1
    from public.sections s
    where s.portfolio_id = a.portfolio_id
      and s.type = 'achievements'
  );

create index if not exists achievements_section_order_idx
  on public.achievements(section_id, sort_order);
