-- Добавляет ручной порядок портфолио на главной странице.
alter table public.portfolios
add column if not exists sort_order integer not null default 10;

-- Назначаем существующим портфолио последовательный порядок,
-- сохраняя текущую сортировку от новых к старым.
with ordered as (
  select id, row_number() over (partition by owner_id order by created_at desc) * 10 as new_order
  from public.portfolios
)
update public.portfolios p
set sort_order = ordered.new_order
from ordered
where p.id = ordered.id;

create index if not exists portfolios_owner_order_idx
on public.portfolios(owner_id, sort_order);
