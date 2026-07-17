-- Выполните один раз в Supabase → SQL Editor для уже созданного проекта.
-- Существующие портфолио и проекты сохранятся.
alter table public.projects
add column if not exists video_urls jsonb not null default '[]'::jsonb;
