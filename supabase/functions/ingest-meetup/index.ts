import { createClient } from 'jsr:@supabase/supabase-js@2';

const MEETUP_CLIENT_ID = Deno.env.get('MEETUP_CLIENT_ID')!;
const MEETUP_CLIENT_SECRET = Deno.env.get('MEETUP_CLIENT_SECRET')!;
const MEETUP_REFRESH_TOKEN = Deno.env.get('MEETUP_REFRESH_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LOCATIONS = [
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'New York',    lat: 40.7128, lng: -74.0060  },
  { name: 'Chicago',     lat: 41.8781, lng: -87.6298  },
];

const RADIUS = 25; // miles

interface MeetupEvent {
  id: string;
  name: string;
  time: number;          // Unix ms
  duration?: number;     // ms
  link: string;
  description?: string;
  featured_photo?: { photo_link: string };
  fee?: { amount: number; currency: string };
  venue?: {
    name?: string;
    address_1?: string;
    city?: string;
    state?: string;
    lat?: number;
    lon?: number;
  };
  group?: {
    name?: string;
    category?: { name?: string };
  };
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://secure.meetup.com/oauth2/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MEETUP_CLIENT_ID,
      client_secret: MEETUP_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: MEETUP_REFRESH_TOKEN,
    }),
  });

  if (!res.ok) {
    throw new Error(`Meetup OAuth error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

async function fetchMeetupEvents(
  token: string,
  lat: number,
  lng: number,
): Promise<MeetupEvent[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    radius: String(RADIUS),
    page: '50',
    only_weekends: 'false',
    sign: 'true',
  });

  const res = await fetch(
    `https://api.meetup.com/find/upcoming_events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    console.error(`Meetup API error: ${res.status} ${await res.text()}`);
    return [];
  }

  const json = await res.json();
  const events: MeetupEvent[] = json.events ?? [];
  console.log(`Meetup (${lat},${lng}): ${events.length} events`);
  return events;
}

function normalize(event: MeetupEvent) {
  const venue = event.venue;
  const lat = venue?.lat ?? null;
  const lng = venue?.lon ?? null;

  // Skip events without a precise venue location
  if (!lat || !lng || lat === 0 || lng === 0) return null;

  const startsAt = new Date(event.time).toISOString();
  const endsAt = event.duration
    ? new Date(event.time + event.duration).toISOString()
    : null;

  const address = [venue?.address_1, venue?.city, venue?.state]
    .filter(Boolean)
    .join(', ') || null;

  const category = event.group?.category?.name?.toLowerCase() ?? null;

  return {
    source: 'meetup',
    source_id: event.id,
    title: event.name,
    description: event.description ?? null,
    starts_at: startsAt,
    ends_at: endsAt,
    venue_name: venue?.name ?? event.group?.name ?? null,
    address,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    image_url: event.featured_photo?.photo_link ?? null,
    url: event.link,
    category,
    price_min: event.fee?.amount ?? 0,
    price_max: event.fee?.amount ?? 0,
    currency: event.fee?.currency ?? 'USD',
  };
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let totalUpserted = 0;

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Failed to get Meetup token:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  for (const city of LOCATIONS) {
    const events = await fetchMeetupEvents(token, city.lat, city.lng);
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
    { headers: { 'Content-Type': 'application/json' } },
  );
});
