-- Enable PostGIS for geospatial queries
create extension if not exists postgis;

-- Unified events table
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,           -- 'eventbrite' | 'ticketmaster' | 'stubhub' | 'meetup'
  source_id    text not null,           -- original ID from the source
  title        text not null,
  description  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  venue_name   text,
  address      text,
  location     geography(point, 4326),  -- PostGIS point (lng, lat)
  image_url    text,
  url          text,
  category     text,
  price_min    numeric(10,2),
  price_max    numeric(10,2),
  currency     text default 'USD',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  unique (source, source_id)            -- prevent duplicates on re-ingestion
);

-- Spatial index for fast radius queries
create index if not exists events_location_idx
  on events using gist (location);

-- Index for filtering by time
create index if not exists events_starts_at_idx
  on events (starts_at);

-- Function: get events within radius (meters) of a point
create or replace function nearby_events(
  lat        double precision,
  lng        double precision,
  radius_m   double precision default 10000,  -- 10km default
  from_time  timestamptz      default now()
)
returns setof events
language sql stable
as $$
  select *
  from events
  where
    st_dwithin(
      location,
      st_point(lng, lat)::geography,
      radius_m
    )
    and starts_at >= from_time
  order by
    st_distance(location, st_point(lng, lat)::geography) asc,
    starts_at asc;
$$;

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at
  before update on events
  for each row execute function update_updated_at();
