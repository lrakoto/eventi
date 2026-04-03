import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import EventBottomSheet, { EventSummary } from '@/components/EventBottomSheet';
import { NearbyEvent, useNearbyEvents } from '@/hooks/useNearbyEvents';

type SortMode = 'distance' | 'date';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatPrice(min: number | null, max: number | null, currency: string) {
  if (min === 0 && (max === 0 || max === null)) return 'Free';
  if (min === null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  return fmt(min);
}

function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type EventRowProps = {
  event: NearbyEvent;
  userLat: number;
  userLng: number;
  onPress: () => void;
};

function EventRow({ event, userLat, userLng, onPress }: EventRowProps) {
  const dist = distanceKm(userLat, userLng, event.lat, event.lng);
  const distLabel = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
  const price = formatPrice(event.price_min, event.price_max, event.currency);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {event.image_url ? (
        <Image source={{ uri: event.image_url }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.rowMeta}>{formatDate(event.starts_at)}</Text>
        {event.venue_name && (
          <Text style={styles.rowMeta} numberOfLines={1}>{event.venue_name}</Text>
        )}
        <View style={styles.rowFooter}>
          <Text style={styles.rowDist}>{distLabel} away</Text>
          {price && <Text style={styles.rowPrice}>{price}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

export default function ListScreen() {
  const { events, loading, errorMsg, userLocation } = useNearbyEvents();
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);

  const sorted = [...events].sort((a, b) => {
    if (sortMode === 'date') {
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    }
    if (!userLocation) return 0;
    const dA = distanceKm(userLocation.latitude, userLocation.longitude, a.lat, a.lng);
    const dB = distanceKm(userLocation.latitude, userLocation.longitude, b.lat, b.lng);
    return dA - dB;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Sort toggle */}
      <View style={styles.sortBar}>
        <Pressable
          style={[styles.sortBtn, sortMode === 'distance' && styles.sortBtnActive]}
          onPress={() => setSortMode('distance')}
        >
          <Text style={[styles.sortBtnText, sortMode === 'distance' && styles.sortBtnTextActive]}>
            Nearest
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sortBtn, sortMode === 'date' && styles.sortBtnActive]}
          onPress={() => setSortMode('date')}
        >
          <Text style={[styles.sortBtnText, sortMode === 'date' && styles.sortBtnTextActive]}>
            Soonest
          </Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Finding nearby events…</Text>
        </View>
      )}

      {errorMsg && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {!loading && !errorMsg && (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventRow
              event={item}
              userLat={userLocation?.latitude ?? 0}
              userLng={userLocation?.longitude ?? 0}
              onPress={() => setSelectedEvent(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No events found nearby.</Text>
          }
        />
      )}

      <EventBottomSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  sortBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  sortBtnActive: {
    backgroundColor: '#111',
  },
  sortBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  sortBtnTextActive: {
    color: '#fff',
  },
  list: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: 90,
    height: 90,
  },
  thumbPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  rowContent: {
    flex: 1,
    padding: 10,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  rowMeta: {
    fontSize: 13,
    color: '#555',
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowDist: {
    fontSize: 12,
    color: '#999',
  },
  rowPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
  },
  separator: {
    height: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});
