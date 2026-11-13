-- Keep existing community events and saved-event references for a future release.
-- A restrictive policy also applies if a permissive read policy was added in the dashboard.
alter table public.events enable row level security;
grant select on public.events to anon, authenticated;

create policy "Launch feed contains only Ticketmaster events" on public.events
  as restrictive for select to anon, authenticated
  using (source = 'ticketmaster' and not hidden);

drop policy if exists "Users can insert own events" on public.events;
drop policy if exists "Users can update own events" on public.events;
drop policy if exists "Users can delete own events" on public.events;

-- Older builds cannot write through the API. Ingestion and account deletion
-- continue to use the service role, whose grants are unaffected.
revoke insert, update, delete, truncate on public.events from public, anon, authenticated;
revoke update (title, description, starts_at, ends_at, venue_name, address, location,
               image_url, url, category, price_min, price_max, currency, created_by, source)
  on public.events from authenticated;
