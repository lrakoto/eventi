import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import * as Location from 'expo-location';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { EventSummary } from '@/components/EventBottomSheet';
import { SEARCH_RADIUS_M, SPARSE_THRESHOLD } from '@/constants/config';

export type NearbyEvent = EventSummary & { lat: number; lng: number; created_at: string };

type Coords = { latitude: number; longitude: number };

type EventsContextType = {
  events: NearbyEvent[];
  loading: boolean;
  errorMsg: string | null;
  userLocation: Coords | null;
  refresh: () => Promise<void>;
};

const EventsContext = createContext<EventsContextType>({
  events: [],
  loading: true,
  errorMsg: null,
  userLocation: null,
  refresh: async () => {},
});

// Single source of nearby events for the map, list sheet, explore tab and search:
// location + DB query + on-demand ingest happen once, not per screen.
export function EventsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const ingestTried = useRef(false);

  // Resolve location once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enable it in Settings to see nearby events.');
        setLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {
        setErrorMsg('Could not determine your location. Please try again.');
        setLoading(false);
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!userLocation) return;
    const { latitude, longitude } = userLocation;
    let data = await fetchFromDB(latitude, longitude);

    // Sparse area: ask the backend to pull from Ticketmaster once per session, then re-fetch
    if (data.length < SPARSE_THRESHOLD && !ingestTried.current) {
      ingestTried.current = true;
      await triggerIngest(latitude, longitude);
      data = await fetchFromDB(latitude, longitude);
    }

    setEvents(data);
    setLoading(false);
  }, [userLocation]);

  // Fetch when location resolves, and again when the user signs in/out
  // (blocked users and reported events are filtered per-user server-side).
  useEffect(() => {
    refresh();
  }, [refresh, session?.user.id]);

  return (
    <EventsContext.Provider value={{ events, loading, errorMsg, userLocation, refresh }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useNearbyEvents() {
  return useContext(EventsContext);
}

async function fetchFromDB(lat: number, lng: number): Promise<NearbyEvent[]> {
  const { data, error } = await supabase.rpc('nearby_events', {
    lat,
    lng,
    radius_m: SEARCH_RADIUS_M,
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
