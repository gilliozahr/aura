-- AURA v0.5 migration — run in Supabase SQL editor for existing projects
-- New projects: use schema.sql instead (already includes these changes).

-- Add payload column to feedback_events (stores outfit item IDs on outfit feedback)
alter table public.feedback_events
  add column if not exists payload jsonb;

-- Add saved_outfits table for outfit history
create table if not exists public.saved_outfits (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  outfit_items jsonb not null default '[]',
  report       jsonb not null default '{}',
  feedback     text,
  created_at   timestamptz not null default now()
);

alter table public.saved_outfits enable row level security;

create policy "Users own their saved outfits"
  on public.saved_outfits for all
  using (auth.uid() = user_id);
