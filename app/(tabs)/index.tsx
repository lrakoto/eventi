import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

const INITIAL_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
const RADIUS_METERS = 50000; // 50km (temporary for testing)

type Event = {
  id: string;
  title: string;
  venue_name: string | null;
  starts_at: string;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  lat: number;
  lng: number;
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enable it in Settings to see nearby events.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setRegion({ latitude, longitude, ...INITIAL_DELTA });
      fetchEvents(latitude, longitude);
    })();
  }, []);

  async function fetchEvents(lat: number, lng: number) {
    const { data, error } = await supabase.rpc('nearby_events', {
      lat,
      lng,
      radius_m: RADIUS_METERS,
    });
    if (error) {
      console.error('fetchEvents error:', error.message);
      return;
    }
    setEvents(data ?? []);
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Finding your location…</Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton
    >
      {events.map((event) => (
        <Marker
          key={event.id}
          coordinate={{ latitude: event.lat, longitude: event.lng }}
          title={event.title}
          description={event.venue_name ?? undefined}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#c00',
    textAlign: 'center',
  },
});
