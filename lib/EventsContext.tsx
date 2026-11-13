import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as Location from 'expo-location';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import type { EventSummary } from '@/components/EventBottomSheet';
import { SEARCH_RADIUS_M, SPARSE_THRESHOLD } from '@/constants/config';

export type NearbyEvent = EventSummary & { lat: number; lng: number; created_at: string };

type DiscoveryArea = {
  kind: 'city' | 'device';
  name: string;
  latitude: number;
  longitude: number;
  timeZone?: string;
};

export const DISCOVERY_CITIES = [
  { kind: 'city', name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, timeZone: 'America/Los_Angeles' },
  { kind: 'city', name: 'New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  { kind: 'city', name: 'Chicago', latitude: 41.8781, longitude: -87.6298, timeZone: 'America/Chicago' },
] as const satisfies readonly DiscoveryArea[];

type DiscoveryCity = (typeof DISCOVERY_CITIES)[number];
type LocationError = 'permission' | 'unavailable';
type EventsResult = {
  area: DiscoveryArea;
  events: NearbyEvent[];
  loading: boolean;
  errorMsg: string | null;
};

type EventsContextType = EventsResult & {
  locating: boolean;
  locationError: LocationError | null;
  chooseCity: (city: DiscoveryCity) => void;
  requestDeviceLocation: () => Promise<boolean>;
  cancelLocationLookup: () => void;
  refresh: () => Promise<void>;
};

const DEFAULT_AREA = DISCOVERY_CITIES[0];
const REQUEST_TIMEOUT_MS = 15_000;
const LOCATION_TIMEOUT_MS = 8_000;
const EventsContext = createContext<EventsContextType | null>(null);

function loadingResult(area: DiscoveryArea): EventsResult {
  return { area, events: [], loading: true, errorMsg: null };
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [area, setArea] = useState<DiscoveryArea>(DEFAULT_AREA);
  const [result, setResult] = useState<EventsResult>(() => loadingResult(DEFAULT_AREA));
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationError | null>(null);
  const locationAttempt = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  function cancelLocationLookup() {
    locationAttempt.current += 1;
    setLocating(false);
    setLocationError(null);
  }

  function chooseCity(city: DiscoveryCity) {
    cancelLocationLookup();
    setArea(city);
  }

  async function requestDeviceLocation(): Promise<boolean> {
    const attempt = ++locationAttempt.current;
    setLocating(true);
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (attempt !== locationAttempt.current) return false;
      if (!permission.granted) {
        setLocationError('permission');
        return false;
      }

      const location = await resolveDeviceLocation();
      if (attempt !== locationAttempt.current) return false;
      setArea({
        kind: 'device',
        name: 'My Location',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      return true;
    } catch {
      if (attempt === locationAttempt.current) setLocationError('unavailable');
      return false;
    } finally {
      if (attempt === locationAttempt.current) setLocating(false);
    }
  }

  const refresh = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const isCurrent = () => activeRequest.current === controller;

    setResult((previous) => ({
      ...loadingResult(area),
      events: previous.area === area ? previous.events : [],
    }));

    try {
      const events = await fetchFromDB(area, controller.signal);
      if (!isCurrent()) return;

      if (events.length >= SPARSE_THRESHOLD) {
        setResult({ area, events, loading: false, errorMsg: null });
        return;
      }

      // Keep a partial list visible while Ticketmaster fills in a sparse area.
      setResult({ area, events, loading: true, errorMsg: null });
      const { error } = await supabase.functions.invoke('ingest-for-location', {
        body: { lat: Number(area.latitude.toFixed(1)), lng: Number(area.longitude.toFixed(1)) },
        signal: controller.signal,
      });
      if (!isCurrent()) return;
      if (error) throw error;

      const updatedEvents = await fetchFromDB(area, controller.signal);
      if (isCurrent()) setResult({ area, events: updatedEvents, loading: false, errorMsg: null });
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Could not load events:', error);
      setResult((previous) => ({ ...previous, loading: false, errorMsg: 'Could not load events.' }));
    } finally {
      clearTimeout(timeout);
      if (isCurrent()) activeRequest.current = null;
    }
  }, [area]);

  useEffect(() => {
    void refresh();
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [refresh, session?.user.id]);

  useEffect(() => () => { locationAttempt.current += 1; }, []);

  const currentResult = result.area === area ? result : loadingResult(area);
  return (
    <EventsContext.Provider value={{
      ...currentResult, locating, locationError, chooseCity, requestDeviceLocation, cancelLocationLookup, refresh,
    }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useNearbyEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error('useNearbyEvents must be used within an EventsProvider');
  return context;
}

async function resolveDeviceLocation() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Location lookup timed out')), LOCATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromDB(area: DiscoveryArea, signal: AbortSignal): Promise<NearbyEvent[]> {
  const { data, error } = await supabase.rpc('nearby_events', {
    lat: area.latitude,
    lng: area.longitude,
    radius_m: SEARCH_RADIUS_M,
  }).abortSignal(signal);
  if (error) throw error;

  const events: (NearbyEvent & { source: string })[] = data ?? [];
  return events.filter((event) => event.source === 'ticketmaster');
}
