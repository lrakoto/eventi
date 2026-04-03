import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import EventBottomSheet, { EventSummary } from '@/components/EventBottomSheet';
import { useNearbyEvents } from '@/hooks/useNearbyEvents';

const INITIAL_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function MapScreen() {
  const { events, loading, errorMsg, userLocation } = useNearbyEvents();
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);

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

  const region: Region = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    ...INITIAL_DELTA,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.lat, longitude: event.lng }}
            onPress={() => setSelectedEvent(event)}
          />
        ))}
      </MapView>

      <EventBottomSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
