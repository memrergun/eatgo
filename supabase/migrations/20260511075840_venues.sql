-- EatGo - Supabase şeması
-- Supabase Dashboard > SQL Editor'a yapıştır ve çalıştır

create table if not exists venues (
  id           text primary key,
  name         text not null,
  slug         text unique not null,
  category     text,
  lat          double precision,
  lng          double precision,
  rating       numeric(3,1),
  review_count integer,
  price_range  text,
  featured     boolean default false,
  data         jsonb not null,
  updated_at   timestamptz default now()
);

-- Herkese okuma izni (RLS)
alter table venues enable row level security;

create policy "Public read"
  on venues for select
  using (true);

-- Slug ve kategori üzerinde index
create index if not exists idx_venues_slug     on venues (slug);
create index if not exists idx_venues_category on venues (category);
