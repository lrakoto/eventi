import { createClient } from 'jsr:@supabase/supabase-js@2';

const TM_API_KEY = Deno.env.get('TICKETMASTER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const RADIUS = '25';
const RADIUS_UNIT = 'miles';
const STALE_HOURS = 6; // re-fetch if no events ingested for this area in 6 hours

interface TmEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { dateTime?: string; localDate?: string; localTime?: string };
    end?: { dateTime?: string };
  };
  images?: { url: string; width: number; height: number }[];
  classifications?: { segment?: { name: string }; genre?: { name: string } }[];
  priceRanges?: { min: number; max: number; currency: string }[];
  _embedded?: {
    venues?: {
      name?: string;
      address?: { line1?: string };
      city?: { name?: string };
      state?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
}

function bestImage(images?: TmEvent['images']): string | null {
  if (!images?.length) return null;
  return images.sort((a, b) => b.width - a.width)[0].url;
}

function normalize(event: TmEvent) {
  const venue = event._embedded?.venues?.[0];
  const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
  const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;
  if (!lat || !lng) return null;

  const startsAt = event.dates.start.dateTime
    ?? `${event.dates.start.localDate}T${event.dates.start.localTime ?? '00:00:00'}`;

  const classification = event.classifications?.[0];
  const category = [classification?.segment?.name, classification?.genre?.name]
    .filter(Boolean).join('/').toLowerCase() || null;

  const price = event.priceRanges?.[0];
  const address = [
    venue?.address?.line1,
    venue?.city?.name,
    venue?.state?.name,
  ].filter(Boolean).join(', ') || null;

  return {
    source: 'ticketmaster',
    source_id: event.id,
    title: event.name,
    description: null,
    starts_at: startsAt,
    ends_at: event.dates.end?.dateTime ?? null,
    venue_name: venue?.name ?? null,
    address,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    image_url: bestImage(event.images),
    url: event.url,
    category,
    price_min: price?.min ?? null,
    price_max: price?.max ?? null,
    currency: price?.currency ?? 'USD',
  };
}

Deno.serve(async (req) => {
  const { lat, lng } = await req.json();

  if (!lat || !lng) {
    return new Response(JSON.stringify({ error: 'lat and lng required' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Check if we've recently ingested events for this area
  const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();
  const { data: recentEvents } = await supabase.rpc('nearby_events', {
    lat,
    lng,
    radius_m: 5000, // 5km check radius
  });

  const hasRecentData = recentEvents?.some(
    (e: { created_at: string }) => e.created_at > staleThreshold
  );

  if (hasRecentData) {
    console.log(`Area (${lat},${lng}) already has fresh data, skipping fetch`);
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'fresh' }));
  }

  // Fetch from Ticketmaster
  const now = new Date().toISOString().slice(0, 19) + 'Z';
  const params = new URLSearchParams({
    apikey: TM_API_KEY,
    latlong: `${lat},${lng}`,
    radius: RADIUS,
    unit: RADIUS_UNIT,
    size: '50',
    sort: 'date,asc',
    startDateTime: now,
  });

  const res = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
  );

  if (!res.ok) {
    console.error(`Ticketmaster API error: ${res.status}`);
    return new Response(JSON.stringify({ error: 'Ticketmaster API error' }), { status: 502 });
  }

  const json = await res.json();
  const tmEvents: TmEvent[] = json._embedded?.events ?? [];
  const rows = tmEvents.map(normalize).filter(Boolean);

  if (rows.length > 0) {
    const { error } = await supabase
      .from('events')
      .upsert(rows, { onConflict: 'source,source_id' });

    if (error) {
      console.error('Upsert error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  console.log(`Ingested ${rows.length} events for (${lat},${lng})`);
  return new Response(JSON.stringify({ ok: true, upserted: rows.length }));
});
