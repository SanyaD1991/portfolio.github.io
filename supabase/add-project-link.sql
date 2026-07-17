-- Добавляет внешнюю ссылку к карточкам проектов.
-- Безопасно запускать повторно.

alter table public.projects
add column if not exists project_url text;
