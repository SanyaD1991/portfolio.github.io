-- Добавляет PDF-файл к достижениям, сертификатам и дипломам.
-- Повторный запуск безопасен.

alter table public.achievements
add column if not exists pdf_url text;
