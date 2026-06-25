-- Add created_by to events (null = ingested from external API, uuid = user-created)
alter table events add column if not exists created_by uuid references auth.users(id) on delete set null;
create index if not exists events_created_by_idx on events (created_by);

-- Write policies for user-created events
-- (Public read policy assumed already enabled via Supabase dashboard)
drop policy if exists "Users can insert own events" on events;
drop policy if exists "Users can update own events" on events;
drop policy if exists "Users can delete own events" on events;

create policy "Users can insert own events" on events
  for insert with check (auth.uid() = created_by);

create policy "Users can update own events" on events
  for update using (auth.uid() = created_by);

create policy "Users can delete own events" on events
  for delete using (auth.uid() = created_by);

-- Saved events
create table if not exists saved_events (
  user_id  uuid references auth.users(id) on delete cascade not null,
  event_id uuid references events(id) on delete cascade not null,
  saved_at timestamptz default now(),
  primary key (user_id, event_id)
);

alter table saved_events enable row level security;

drop policy if exists "Users manage own saved events" on saved_events;
create policy "Users manage own saved events" on saved_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
