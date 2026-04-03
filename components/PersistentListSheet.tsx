import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NearbyEvent } from '@/hooks/useNearbyEvents';
import { useEventSheet } from '@/lib/EventSheetContext';
import { SHEET_HEIGHT } from '@/constants/layout';

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

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
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

type Props = {
  events: NearbyEvent[];
  userLat: number;
  userLng: number;
};

export default function PersistentListSheet({ events, userLat, userLng }: Props) {
  const { openSheet } = useEventSheet();

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.heading}>Nearby Events</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const dist = distanceKm(userLat, userLng, item.lat, item.lng);
          const distLabel = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
          const price = formatPrice(item.price_min, item.price_max, item.currency);

          return (
            <Pressable style={styles.row} onPress={() => openSheet(item)}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>{formatDate(item.starts_at)}</Text>
                {item.venue_name && (
                  <Text style={styles.rowMeta} numberOfLines={1}>{item.venue_name}</Text>
                )}
                <View style={styles.rowFooter}>
                  <Text style={styles.rowDist}>{distLabel} away</Text>
                  {price && <Text style={styles.rowPrice}>{price}</Text>}
                </View>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No events found nearby.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: 80,
    height: 80,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  rowMeta: {
    fontSize: 12,
    color: '#555',
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowDist: {
    fontSize: 11,
    color: '#999',
  },
  rowPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111',
  },
  separator: {
    height: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 24,
    fontSize: 14,
  },
});
