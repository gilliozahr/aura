-- v0.8 Migration: Trip Plans table for Packing + Trip Intelligence Engine

create table if not exists public.trip_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination_city text not null,
  destination_country text,
  start_date date not null,
  end_date date not null,
  purpose text not null default 'Mixed',
  occasions jsonb not null default '[]',
  luggage_type text not null default 'Checked bag',
  laundry_available boolean not null default false,
  weather_summary jsonb,
  daily_outfits jsonb not null default '[]',
  packing_items jsonb not null default '[]',
  missing_items jsonb not null default '[]',
  risk_notes jsonb not null default '[]',
  capsule_notes text,
  ai_summary text,
  ai_enhanced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trip_plans enable row level security;

create policy "Users can read own trip plans"
  on public.trip_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own trip plans"
  on public.trip_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trip plans"
  on public.trip_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own trip plans"
  on public.trip_plans for delete
  using (auth.uid() = user_id);
