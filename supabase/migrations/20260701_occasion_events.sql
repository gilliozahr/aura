-- v1.4: Occasion Events table for Calendar & Occasion Intelligence
create extension if not exists "pgcrypto";

create table if not exists public.occasion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_type text not null
    check (event_type in (
      'Business Meeting', 'Dinner', 'Wedding', 'Brunch', 'Travel',
      'Casual', 'Formal Event', 'Family', 'Date Night', 'Other'
    )),
  event_date date not null,
  start_time text nullable,
  end_time text nullable,
  city text nullable,
  country text nullable,
  latitude numeric nullable,
  longitude numeric nullable,
  country_code text nullable,
  formality text not null default 'Smart Casual'
    check (formality in ('Casual', 'Smart Casual', 'Business', 'Cocktail', 'Formal', 'Black Tie')),
  dress_code text nullable
    check (dress_code is null or dress_code in (
      'Smart Casual', 'Business Casual', 'Business Formal', 'Cocktail',
      'Black Tie', 'White Tie', 'Casual', 'Theme'
    )),
  importance text not null default 'Normal'
    check (importance in ('Low', 'Normal', 'High', 'Critical')),
  notes text nullable,
  weather_context jsonb nullable,
  recommended_outfit jsonb nullable,
  outfit_status text not null default 'pending'
    check (outfit_status in ('pending', 'accepted', 'rejected', 'edited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.occasion_events enable row level security;

create policy "Users manage own occasion events"
  on public.occasion_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
