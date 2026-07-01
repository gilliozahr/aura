-- v1.3: Outfit Plans table for Smart Closet Calendar
create extension if not exists "pgcrypto";

create table if not exists public.outfit_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  occasion_event_id uuid nullable,
  trip_plan_id uuid nullable,
  outfit_items jsonb not null default '[]',
  recommendation jsonb not null default '{}',
  status text not null default 'planned'
    check (status in ('planned', 'worn', 'skipped', 'changed')),
  source text not null default 'planner'
    check (source in ('planner', 'manual', 'occasion', 'trip', 'daily')),
  notes text nullable,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, plan_date)
);

alter table public.outfit_plans enable row level security;

create policy "Users manage own outfit plans"
  on public.outfit_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
