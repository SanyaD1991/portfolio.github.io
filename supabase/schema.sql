-- Выполните этот файл в Supabase → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  subtitle text,
  about text,
  cover_url text,
  contact_email text,
  accent_color text not null default '#d95d39',
  background_color text not null default '#f4f0e8',
  text_color text not null default '#161616',
  is_published boolean not null default false,
  sort_order integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  title text not null,
  type text not null check (type in ('text','projects','achievements')),
  body text,
  sort_order integer not null default 10,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  title text not null,
  summary text,
  description text,
  year text,
  role text,
  cover_url text,
  project_url text,
  gallery jsonb not null default '[]'::jsonb,
  video_urls jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  sort_order integer not null default 10,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  title text not null,
  issuer text,
  achievement_date text,
  description text,
  image_url text,
  pdf_url text,
  link_url text,
  sort_order integer not null default 10,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;
alter table public.sections enable row level security;
alter table public.projects enable row level security;
alter table public.achievements enable row level security;

create policy "Published portfolios are public"
on public.portfolios for select
using (is_published = true or auth.uid() = owner_id);

create policy "Owners create portfolios"
on public.portfolios for insert to authenticated
with check (auth.uid() = owner_id);

create policy "Owners update portfolios"
on public.portfolios for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners delete portfolios"
on public.portfolios for delete to authenticated
using (auth.uid() = owner_id);

create policy "Published sections are public"
on public.sections for select
using (
  auth.uid() = owner_id
  or (
    is_published = true
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.is_published = true
    )
  )
);

create policy "Owners create sections"
on public.sections for insert to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.portfolios p
    where p.id = portfolio_id and p.owner_id = auth.uid()
  )
);

create policy "Owners update sections"
on public.sections for update to authenticated
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.portfolios p
    where p.id = portfolio_id and p.owner_id = auth.uid()
  )
);

create policy "Owners delete sections"
on public.sections for delete to authenticated
using (auth.uid() = owner_id);

create policy "Published projects are public"
on public.projects for select
using (
  auth.uid() = owner_id
  or (
    is_published = true
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.is_published = true
    )
  )
);

create policy "Owners create projects"
on public.projects for insert to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.portfolios p
    where p.id = portfolio_id and p.owner_id = auth.uid()
  )
);

create policy "Owners update projects"
on public.projects for update to authenticated
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.portfolios p
    where p.id = portfolio_id and p.owner_id = auth.uid()
  )
);

create policy "Owners delete projects"
on public.projects for delete to authenticated
using (auth.uid() = owner_id);

create policy "Published achievements are public"
on public.achievements for select
using (
  auth.uid() = owner_id
  or (
    is_published = true
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.is_published = true
    )
  )
);

create policy "Owners create achievements"
on public.achievements for insert to authenticated
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.portfolios p
    where p.id = portfolio_id and p.owner_id = auth.uid()
  )
);

create policy "Owners update achievements"
on public.achievements for update to authenticated
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.portfolios p
    where p.id = portfolio_id and p.owner_id = auth.uid()
  )
);

create policy "Owners delete achievements"
on public.achievements for delete to authenticated
using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do update set public = true;

create policy "Public can view portfolio media" on storage.objects for select using (bucket_id = 'portfolio-media');
create policy "Users upload to own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own media" on storage.objects for update to authenticated
using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own media" on storage.objects for delete to authenticated
using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);

create index if not exists portfolios_owner_order_idx on public.portfolios(owner_id, sort_order);
create index if not exists sections_portfolio_order_idx on public.sections(portfolio_id, sort_order);
create index if not exists projects_portfolio_order_idx on public.projects(portfolio_id, sort_order);
create index if not exists projects_section_order_idx on public.projects(section_id, sort_order);
create index if not exists achievements_portfolio_order_idx on public.achievements(portfolio_id, sort_order);
create index if not exists achievements_section_order_idx on public.achievements(section_id, sort_order);
