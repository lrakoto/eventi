import { createClient } from 'jsr:@supabase/supabase-js@2';

const EVENTBRITE_TOKEN = Deno.env.get('EVENTBRITE_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cities to ingest events for — expand this list over time
const LOCATIONS = [
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'New York',    lat: 40.7128, lng: -74.0060  },
  { name: 'Chicago',     lat: 41.8781, lng: -87.6298  },
];

const RADIUS = '25km';

interface EventbriteVenue {
  name?: string;
  address?: {
    localized_address_display?: string;
    latitude?: string;
    longitude?: string;
  };
}

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description?: { text?: string };
  start: { utc: string };
  end?: { utc: string };
  venue?: EventbriteVenue;
  logo?: { url?: string };
  url: string;
  category_id?: string;
  is_free: boolean;
  ticket_availability?: {
    minimum_ticket_price?: { major_value: string; currency: string };
    maximum_ticket_price?: { major_value: string; currency: string };
  };
}

async function fetchEventbriteEvents(lat: number, lng: number): Promise<EventbriteEvent[]> {
  const params = new URLSearchParams({
    'location.latitude': String(lat),
    'location.longitude': String(lng),
    'location.within': RADIUS,
    'expand': 'venue,ticket_availability,logo',
    'status': 'live',
    'page_size': '50',
  });

  const res = await fetch(
    `https://www.eventbriteapi.com/v3/events/search/?${params}`,
    { headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` } }
  );

  if (!res.ok) {
    console.error(`Eventbrite API error: ${res.status} ${await res.text()}`);
    return [];
  }

  const json = await res.json();
  console.log(`Eventbrite raw response for (${lat},${lng}):`, JSON.stringify(json).slice(0, 500));
  return json.events ?? [];
}

function normalize(event: EventbriteEvent) {
  const venue = event.venue;
  const lat = venue?.address?.latitude ? parseFloat(venue.address.latitude) : null;
  const lng = venue?.address?.longitude ? parseFloat(venue.address.longitude) : null;

  if (!lat || !lng) return null; // skip events without a location

  const pricing = event.ticket_availability;
  const priceMin = event.is_free ? 0
    : pricing?.minimum_ticket_price?.major_value
      ? parseFloat(pricing.minimum_ticket_price.major_value)
      : null;
  const priceMax = pricing?.maximum_ticket_price?.major_value
    ? parseFloat(pricing.maximum_ticket_price.major_value)
    : null;
  const currency = pricing?.minimum_ticket_price?.currency ?? 'USD';

  return {
    source: 'eventbrite',
    source_id: event.id,
    title: event.name.text,
    description: event.description?.text ?? null,
    starts_at: event.start.utc,
    ends_at: event.end?.utc ?? null,
    venue_name: venue?.name ?? null,
    address: venue?.address?.localized_address_display ?? null,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    image_url: event.logo?.url ?? null,
    url: event.url,
    category: event.category_id ?? null,
    price_min: priceMin,
    price_max: priceMax,
    currency,
  };
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let totalUpserted = 0;

  for (const city of LOCATIONS) {
    const events = await fetchEventbriteEvents(city.lat, city.lng);
    const rows = events.map(normalize).filter(Boolean);

    console.log(`${city.name}: ${events.length} raw events, ${rows.length} with valid location`);
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
