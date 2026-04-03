import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { EventSummary } from '@/components/EventBottomSheet';

const RADIUS_METERS = 50000; // 50km (set to 10000 for production)

export type NearbyEvent = EventSummary & { lat: number; lng: number };

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

      const { data, error } = await supabase.rpc('nearby_events', {
        lat: latitude,
        lng: longitude,
        radius_m: RADIUS_METERS,
      });

      if (error) {
        console.error('fetchEvents error:', error.message);
      } else {
        setEvents(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return { events, loading, errorMsg, userLocation };
}
