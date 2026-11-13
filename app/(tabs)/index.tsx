import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MapView, { type Region } from 'react-native-maps';
import { useNearbyEvents } from '@/lib/EventsContext';
import { useEventSheet } from '@/lib/EventSheetContext';
import { useFilters, applyFilters } from '@/lib/FilterContext';
import { SHEET_FRACTION } from '@/constants/layout';
import DiscoveryAreaPicker from '@/components/DiscoveryAreaPicker';
import EventMarker from '@/components/EventMarker';

function centeredRegion(lat: number, lng: number, delta = 0.05): Region {
  return {
    latitude: lat - delta * (SHEET_FRACTION / 2),
    longitude: lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const { area, events } = useNearbyEvents();
  const { openSheet, closeSheet, registerMapPan, selectedEventId } = useEventSheet();
  const { dateFilter, priceFilter, activeCategory } = useFilters();

  const visibleEvents = useMemo(
    () => applyFilters(events, { dateFilter, priceFilter, activeCategory }, area.timeZone),
    [events, dateFilter, priceFilter, activeCategory, area.timeZone],
  );

  useEffect(() => {
    registerMapPan((lat, lng) => {
      mapRef.current?.animateToRegion(centeredRegion(lat, lng), 400);
    });
    return () => registerMapPan(null);
  }, [registerMapPan]);

  const usingDeviceLocation = area.kind === 'device';
  return (
    <View style={styles.container}>
      <MapView
        key={`${area.kind}:${area.latitude},${area.longitude}`}
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={centeredRegion(area.latitude, area.longitude, usingDeviceLocation ? 0.05 : 0.14)}
        showsUserLocation={usingDeviceLocation}
        showsMyLocationButton={usingDeviceLocation}
      >
        {visibleEvents.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            selected={event.id === selectedEventId}
            onPress={() => openSheet(event)}
          />
        ))}
      </MapView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Browsing ${area.name}. Change area`}
        onPress={() => setAreaPickerOpen(true)}
        style={styles.areaButton}
      >
        <MaterialIcons name={usingDeviceLocation ? 'my-location' : 'place'} size={18} color="#111" />
        <Text style={styles.areaLabel}>{area.name}</Text>
        <MaterialIcons name="expand-more" size={18} color="#666" />
      </Pressable>
      <DiscoveryAreaPicker
        visible={areaPickerOpen}
        onClose={() => setAreaPickerOpen(false)}
        onAreaChanged={closeSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  areaButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  areaLabel: { fontSize: 15, fontWeight: '600', color: '#111' },
});
