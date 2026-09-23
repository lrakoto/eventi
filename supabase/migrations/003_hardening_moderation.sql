-- 003: sync repo with live schema, harden user writes, add moderation,
-- account deletion, and an ingest log for rate-limiting on-demand fetches.

-- ─── Public read (previously created in the dashboard) ──────────────────────
alter table events add column if not exists hidden boolean not null default false;

drop policy if exists "Events are publicly readable" on events;
create policy "Events are publicly readable" on events
  for select using (not hidden or created_by = auth.uid());

-- ─── User writes: only source='user' rows, and never the `hidden` flag ───────
drop policy if exists "Users can insert own events" on events;
drop policy if exists "Users can update own events" on events;
drop policy if exists "Users can delete own events" on events;

create policy "Users can insert own events" on events
  for insert with check (auth.uid() = created_by and source = 'user' and not hidden);

create policy "Users can update own events" on events
  for update using (auth.uid() = created_by and source = 'user')
  with check (auth.uid() = created_by and source = 'user');

create policy "Users can delete own events" on events
  for delete using (auth.uid() = created_by and source = 'user');

-- Column-level UPDATE grant so owners can't un-hide a moderated event
revoke update on events from anon, authenticated;
grant update (title, description, starts_at, ends_at, venue_name, address, location,
              image_url, url, category, price_min, price_max, currency, created_by, source)
  on events to authenticated;

-- ─── Saved events: default user_id so inserts pass RLS ───────────────────────
alter table saved_events alter column user_id set default auth.uid();

-- ─── Moderation: reports + blocks (App Store guideline 1.2) ──────────────────
create table if not exists event_reports (
  event_id    uuid references events(id) on delete cascade not null,
  reporter_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  reason      text,
  created_at  timestamptz default now(),
  primary key (event_id, reporter_id)
);

alter table event_reports enable row level security;

drop policy if exists "Users file own reports" on event_reports;
drop policy if exists "Users see own reports" on event_reports;
create policy "Users file own reports" on event_reports
  for insert with check (auth.uid() = reporter_id);
create policy "Users see own reports" on event_reports
  for select using (auth.uid() = reporter_id);

-- Auto-hide an event once 3 different users report it (review in dashboard)
create or replace function hide_reported_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from event_reports where event_id = new.event_id) >= 3 then
    update events set hidden = true where id = new.event_id;
  end if;
  return new;
end;
$$;

drop trigger if exists event_reports_autohide on event_reports;
create trigger event_reports_autohide
  after insert on event_reports
  for each row execute function hide_reported_event();

create table if not exists blocked_users (
  blocker_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  blocked_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

alter table blocked_users enable row level security;

drop policy if exists "Users manage own blocks" on blocked_users;
create policy "Users manage own blocks" on blocked_users
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- ─── nearby_events: matches live shape + created_by/timestamps, moderation
--     filters, and a result cap ─────────────────────────────────────────────
drop function if exists nearby_events(double precision, double precision, double precision, timestamptz);

create function nearby_events(
  lat         double precision,
  lng         double precision,
  radius_m    double precision default 10000,
  from_time   timestamptz      default now(),
  max_results integer          default 300
)
returns table (
  id uuid, source text, source_id text,
  title text, description text,
  starts_at timestamptz, ends_at timestamptz,
  venue_name text, address text,
  lat double precision, lng double precision,
  image_url text, url text,
  category text, price_min numeric, price_max numeric, currency text,
  created_by uuid, created_at timestamptz, updated_at timestamptz
)
language sql stable
as $$
  select
    e.id, e.source, e.source_id,
    e.title, e.description,
    e.starts_at, e.ends_at,
    e.venue_name, e.address,
    st_y(e.location::geometry) as lat,
    st_x(e.location::geometry) as lng,
    e.image_url, e.url,
    e.category, e.price_min, e.price_max, e.currency,
    e.created_by, e.created_at, e.updated_at
  from events e
  where
    st_dwithin(e.location, st_point(lng, lat)::geography, radius_m)
    and e.starts_at >= from_time
    and not e.hidden
    and not exists (
      select 1 from event_reports r
      where r.event_id = e.id and r.reporter_id = auth.uid()
    )
    and (e.created_by is null or not exists (
      select 1 from blocked_users b
      where b.blocker_id = auth.uid() and b.blocked_id = e.created_by
    ))
  order by
    st_distance(e.location, st_point(lng, lat)::geography) asc,
    e.starts_at asc
  limit least(greatest(max_results, 1), 1000);
$$;

-- ─── Account deletion (App Store guideline 5.1.1(v)) ─────────────────────────
create or replace function delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from events where created_by = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;

-- ─── Ingest log: one row per ~11km grid cell, service-role only ─────────────
create table if not exists ingest_log (
  cell     text primary key,
  last_run timestamptz not null default now()
);

alter table ingest_log enable row level security;
