# Eventi

An events aggregator app for iOS (targeting Apple App Store). Pulls events from multiple sources, normalizes them, and displays them on a map centered on the user's location.

## Core Concept
- User opens app → sees map centered on their location with nearby event markers
- Events sourced from official APIs (Ticketmaster, Meetup, StubHub) aggregated into one place
- Backend ingests and normalizes events on a schedule; app queries by location radius
- Key differentiator: map-first UI + true cross-source aggregation (no competitor does this)

## Tech Stack
- **Frontend**: Expo (React Native) + TypeScript
- **Maps**: `react-native-maps` using MapKit (Apple Maps on iOS)
- **Backend/DB**: Supabase — PostgreSQL + PostGIS for geospatial radius queries
- **Auth**: Supabase Auth — Apple Sign-In (required for App Store) + email
- **Event ingestion**: Supabase Edge Functions pulling from external APIs

## Architecture
```
[Edge Functions (cron)]
  → pull from Ticketmaster / Meetup / etc.
  → normalize to unified event schema
  → upsert into Supabase (PostGIS point geometry)

[Expo App]
  → get user GPS location
  → call nearby_events(lat, lng, radius_m) RPC
  → render markers on Apple Maps
```

## Project Structure
```
/app                  -- Expo Router screens
  /(tabs)/index.tsx   -- Map screen (home)
  /(tabs)/explore.tsx -- List view (TBD)
/components           -- shared UI components
/lib
  supabase.ts         -- Supabase client (uses expo-secure-store)
/supabase
  /functions
    /ingest-ticketmaster  -- Edge Function: Ticketmaster ingestion
  /migrations
    001_events.sql        -- events table + PostGIS + nearby_events()
```

## Database
- `events` table with PostGIS `geography(point)` location column
- `nearby_events(lat, lng, radius_m, from_time)` RPC — returns events sorted by distance
- RLS enabled with public read policy
- Dedup via unique constraint on `(source, source_id)`

## Event Sources
| Source | Status | Notes |
|---|---|---|
| Ticketmaster | Working | 5000 calls/day free, pass startDateTime=now() |
| Eventbrite | Skipped | API search endpoint restricted for new keys (404) |
| Meetup | Pending | |
| StubHub | Pending | |

## Key Decisions & Gotchas
- Eventbrite API search is restricted for new accounts — not viable
- Must pass `startDateTime=now()` to Ticketmaster API or you get past events
- `nearby_events()` returns `lat`/`lng` as separate columns (not GeoJSON)
- PostGIS `st_point(lng, lat)` — longitude comes first
- `expo-secure-store` used instead of AsyncStorage (new arch compatibility)
- App radius: 50000m for testing, set back to 10000 for production

## Supabase Project
- Project ref: `sjkvobewtukxbhmhuidh`
- Region: us-east-1

## Current Status
- [x] Stack decided
- [x] Expo project scaffolded (Expo Router + TypeScript)
- [x] Supabase project created + schema migrated
- [x] Map screen with user location + real Ticketmaster markers
- [x] Event ingestion: Ticketmaster (working)
- [ ] Event ingestion: Meetup
- [ ] Scheduled cron for ingest functions
- [ ] Auth (Apple Sign-In + email)
- [ ] Event detail screen (tap marker → details)
- [ ] List/sort view (alternative to map)
- [ ] Event filtering (category, date, price)
- [ ] App Store submission prep

## App Store Requirements
- Apple Sign-In mandatory (offering social login)
- Privacy policy required before submission
- Location usage description in Info.plist ✓
- Must support latest iOS + one prior major version
