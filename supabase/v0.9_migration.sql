-- v0.9 Migration: Occasion Events table for Calendar + Occasion Intelligence

create table if not exists public.occasion_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_type text not null,
  event_date date not null,
  start_time text,
  end_time text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  country_code text,
  formality text not null default 'Smart Casual',
  notes text,
  weather_context jsonb not null default '{}',
  recommended_outfit jsonb,
  outfit_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.occasion_events enable row level security;

create policy "Users can read own occasion events"
  on public.occasion_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own occasion events"
  on public.occasion_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own occasion events"
  on public.occasion_events for update
  using (auth.uid() = user_id);

create policy "Users can delete own occasion events"
  on public.occasion_events for delete
  using (auth.uid() = user_id);
