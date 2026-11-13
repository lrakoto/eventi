import { createClient } from 'jsr:@supabase/supabase-js@2';

const TM_API_KEY = Deno.env.get('TICKETMASTER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

function bestImage(images?: TmEvent['images']): string | null {
  if (!images?.length) return null;
  return images.sort((a, b) => b.width - a.width)[0].url;
}

function normalize(event: TmEvent) {
  const venue = event._embedded?.venues?.[0];
  const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
  const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

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
  if (req.method !== 'POST') {
    return Response.json({ error: 'method not allowed' }, { status: 405 });
  }

  const body = await req.json().catch(() => null);
  const { lat, lng } = body ?? {};

  if (
    typeof lat !== 'number' || typeof lng !== 'number' ||
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    Math.abs(lat) > 90 || Math.abs(lng) > 180
  ) {
    return Response.json({ error: 'numeric lat and lng required' }, { status: 400 });
  }

  // Send only the center of the 0.1° grid cell to Ticketmaster.
  // Convert through Number so coordinates that round to zero use the same cell.
  const cellLat = Number(lat.toFixed(1)).toFixed(1);
  const cellLng = Number(lng.toFixed(1)).toFixed(1);
  const cell = `${cellLat},${cellLng}`;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: claim, error: claimError } = await supabase.rpc('claim_location_ingest', { cell_id: cell });
  if (claimError || !claim) {
    console.error('On-demand ingest claim failed:', claimError?.code);
    return Response.json({ error: 'Could not start ingestion' }, { status: 503 });
  }
  if (claim !== 'claimed') {
    return Response.json({ ok: true, skipped: true, reason: claim });
  }

  // Fetch from Ticketmaster
  const now = new Date().toISOString().slice(0, 19) + 'Z';
  const params = new URLSearchParams({
    apikey: TM_API_KEY,
    latlong: cell,
    radius: RADIUS,
    unit: RADIUS_UNIT,
    size: '50',
    sort: 'date,asc',
    startDateTime: now,
  });

  let tmEvents: TmEvent[];
  try {
    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) {
      console.error('Ticketmaster API error:', res.status);
      return Response.json({ error: 'Ticketmaster API error' }, { status: 502 });
    }
    const json = await res.json();
    tmEvents = json._embedded?.events ?? [];
  } catch {
    console.error('Ticketmaster request failed');
    return Response.json({ error: 'Ticketmaster request failed' }, { status: 502 });
  }

  const rows = tmEvents.map(normalize).filter((row) => row !== null);

  if (rows.length > 0) {
    const { error } = await supabase
      .from('events')
      .upsert(rows, { onConflict: 'source,source_id' });

    if (error) {
      console.error('On-demand event upsert failed:', error.code);
      return Response.json({ error: 'Could not save events' }, { status: 500 });
    }
  }

  const { error: cacheError } = await supabase
    .from('ingest_log')
    .upsert({ cell, last_run: new Date().toISOString() });
  if (cacheError) console.error('On-demand ingest cache update failed:', cacheError.code);

  console.log(`On-demand ingest saved ${rows.length} events`);
  return Response.json({ ok: true, upserted: rows.length });
});
