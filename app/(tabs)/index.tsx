import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { useNearbyEvents } from '@/hooks/useNearbyEvents';
import { useEventSheet } from '@/lib/EventSheetContext';
import { SHEET_FRACTION } from '@/constants/layout';
import EventMarker from '@/components/EventMarker';

const INITIAL_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };
const LAT_OFFSET = INITIAL_DELTA.latitudeDelta * (SHEET_FRACTION / 2);

function centeredRegion(lat: number, lng: number): Region {
  return {
    latitude: lat - LAT_OFFSET,
    longitude: lng,
    ...INITIAL_DELTA,
  };
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const { events, loading, errorMsg, userLocation } = useNearbyEvents();
  const { openSheet, registerMapPan, selectedEventId } = useEventSheet();

  useEffect(() => {
    registerMapPan((lat, lng) => {
      mapRef.current?.animateToRegion(centeredRegion(lat, lng), 400);
    });
    return () => registerMapPan(null);
  }, [registerMapPan]);

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (loading || !userLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Finding your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={centeredRegion(userLocation.latitude, userLocation.longitude)}
        showsUserLocation
        showsMyLocationButton
      >
        {events.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            selected={event.id === selectedEventId}
            onPress={() => openSheet(event)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: { fontSize: 14, color: '#666' },
  errorText: { fontSize: 14, color: '#c00', textAlign: 'center' },
});
