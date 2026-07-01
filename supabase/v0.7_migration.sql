-- v0.7: Style DNA + Personal Memory Engine
-- Safe: CREATE TABLE IF NOT EXISTS, no destructive operations

create table if not exists public.style_dna_profiles (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  preferred_colors         jsonb not null default '[]',
  avoided_colors           jsonb not null default '[]',
  preferred_categories     jsonb not null default '[]',
  preferred_style_tags     jsonb not null default '[]',
  avoided_style_tags       jsonb not null default '[]',
  preferred_occasions      jsonb not null default '[]',
  wardrobe_gaps            jsonb not null default '[]',
  favorite_outfit_patterns jsonb not null default '[]',
  rejected_outfit_patterns jsonb not null default '[]',
  confidence_score         integer not null default 0,
  signal_count             integer not null default 0,
  last_computed_at         timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id)
);

alter table public.style_dna_profiles enable row level security;

create policy "Users can read own Style DNA"
  on public.style_dna_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own Style DNA"
  on public.style_dna_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own Style DNA"
  on public.style_dna_profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own Style DNA"
  on public.style_dna_profiles for delete
  using (auth.uid() = user_id);
