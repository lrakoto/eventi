import { createClient } from 'jsr:@supabase/supabase-js@2';

const TM_API_KEY = Deno.env.get('TICKETMASTER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LOCATIONS = [
  { name: 'Los Angeles',      lat: 34.0522, lng: -118.2437 },
  { name: 'Santa Monica',     lat: 34.2411, lng: -118.4837 },
  { name: 'New York',         lat: 40.7128, lng: -74.0060  },
  { name: 'Chicago',          lat: 41.8781, lng: -87.6298  },
];

const RADIUS = '25';
const RADIUS_UNIT = 'miles';

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

async function fetchTmEvents(lat: number, lng: number): Promise<TmEvent[]> {
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
    console.error(`Ticketmaster API error: ${res.status} ${await res.text()}`);
    return [];
  }

  const json = await res.json();
  const events = json._embedded?.events ?? [];
  console.log(`Ticketmaster (${lat},${lng}): ${events.length} events, page total: ${json.page?.totalElements ?? 0}`);
  return events;
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

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let totalUpserted = 0;

  for (const city of LOCATIONS) {
    const events = await fetchTmEvents(city.lat, city.lng);
    const rows = events.map(normalize).filter(Boolean);

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from('events')
      .upsert(rows, { onConflict: 'source,source_id' });

    if (error) {
      console.error(`Upsert error for ${city.name}:`, error.message);
    } else {
      console.log(`${city.name}: upserted ${rows.length} events`);
      totalUpserted += rows.length;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, upserted: totalUpserted }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
