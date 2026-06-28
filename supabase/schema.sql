-- AURA v0.2 — Supabase schema
-- Run this in the Supabase SQL editor after creating your project.
-- Auth is handled by Supabase Auth; enable Email provider in the dashboard.

-- ─── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── user_profiles ─────────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'User',
  city        text not null default '',
  temperature numeric not null default 25,
  occasion    text not null default '',
  style_goal  text not null default '',
  budget      numeric not null default 500,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
create policy "Users can read own profile"  on public.user_profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.user_profiles for insert with check (auth.uid() = id);

-- ─── wardrobe_items ────────────────────────────────────────────────────────────
create table if not exists public.wardrobe_items (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null,
  color       text not null default '',
  season      text not null default 'All',
  occasion    text not null default '',
  style       text not null default '',
  wears       integer not null default 0,
  confidence  integer not null default 78,
  image_url   text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.wardrobe_items enable row level security;
create policy "Users own their wardrobe" on public.wardrobe_items for all using (auth.uid() = user_id);

-- ─── inspiration_items ─────────────────────────────────────────────────────────
create table if not exists public.inspiration_items (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  category         text not null,
  color            text not null default '',
  style            text not null default '',
  price            numeric not null default 0,
  image_url        text not null default '',
  report           jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

alter table public.inspiration_items enable row level security;
create policy "Users own their inspirations" on public.inspiration_items for all using (auth.uid() = user_id);

-- ─── orders ────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_name   text not null,
  price       numeric not null default 0,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);

alter table public.orders enable row level security;
create policy "Users own their orders" on public.orders for all using (auth.uid() = user_id);

-- ─── stylist_bookings ──────────────────────────────────────────────────────────
create table if not exists public.stylist_bookings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stylist     text not null,
  status      text not null default 'requested',
  booked_at   timestamptz not null default now()
);

alter table public.stylist_bookings enable row level security;
create policy "Users own their bookings" on public.stylist_bookings for all using (auth.uid() = user_id);

-- ─── feedback_events ───────────────────────────────────────────────────────────
create table if not exists public.feedback_events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  score       integer not null default 0,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.feedback_events enable row level security;
create policy "Users own their feedback" on public.feedback_events for all using (auth.uid() = user_id);

-- ─── saved_outfits ─────────────────────────────────────────────────────────────
create table if not exists public.saved_outfits (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  outfit_items jsonb not null default '[]',
  report       jsonb not null default '{}',
  feedback     text,
  created_at   timestamptz not null default now()
);

alter table public.saved_outfits enable row level security;
create policy "Users own their saved outfits" on public.saved_outfits for all using (auth.uid() = user_id);

-- ─── Storage buckets ───────────────────────────────────────────────────────────
-- Create these in the Supabase dashboard > Storage, or via CLI:
--   supabase storage create wardrobe-images --public
--   supabase storage create inspiration-images --public
--
-- Then run the policies below in the SQL editor.

-- wardrobe-images
create policy "Public read wardrobe images"
  on storage.objects for select
  using (bucket_id = 'wardrobe-images');

create policy "Auth users upload own wardrobe images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'wardrobe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth users update own wardrobe images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'wardrobe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth users delete own wardrobe images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'wardrobe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- inspiration-images
create policy "Public read inspiration images"
  on storage.objects for select
  using (bucket_id = 'inspiration-images');

create policy "Auth users upload own inspiration images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'inspiration-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth users update own inspiration images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'inspiration-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Auth users delete own inspiration images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'inspiration-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
