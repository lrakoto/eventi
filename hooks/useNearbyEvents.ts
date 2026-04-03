import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { EventSummary } from '@/components/EventBottomSheet';

const RADIUS_METERS = 50000; // 50km (set to 10000 for production)
const SPARSE_THRESHOLD = 5; // trigger on-demand fetch if fewer than this many events

export type NearbyEvent = EventSummary & { lat: number; lng: number; created_at: string };

export function useNearbyEvents() {
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enable it in Settings to see nearby events.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });

      const data = await fetchFromDB(latitude, longitude);

      // If sparse results, trigger on-demand ingest for this location then re-fetch
      if (data.length < SPARSE_THRESHOLD) {
        console.log(`Sparse results (${data.length}), triggering on-demand ingest...`);
        await triggerIngest(latitude, longitude);
        const refreshed = await fetchFromDB(latitude, longitude);
        setEvents(refreshed);
      } else {
        setEvents(data);
      }

      setLoading(false);
    })();
  }, []);

  return { events, loading, errorMsg, userLocation };
}

async function fetchFromDB(lat: number, lng: number): Promise<NearbyEvent[]> {
  const { data, error } = await supabase.rpc('nearby_events', {
    lat,
    lng,
    radius_m: RADIUS_METERS,
  });
  if (error) {
    console.error('fetchEvents error:', error.message);
    return [];
  }
  return data ?? [];
}

async function triggerIngest(lat: number, lng: number) {
  try {
    const { error } = await supabase.functions.invoke('ingest-for-location', {
      body: { lat, lng },
    });
    if (error) console.error('ingest-for-location error:', error.message);
  } catch (e) {
    console.error('ingest-for-location failed:', e);
  }
}
