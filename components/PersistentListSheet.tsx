import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NearbyEvent } from '@/hooks/useNearbyEvents';
import { useEventSheet } from '@/lib/EventSheetContext';
import { SHEET_HEIGHT } from '@/constants/layout';

type DateFilter = 'all' | 'today' | 'weekend' | 'week';
type PriceFilter = 'any' | 'free' | 'paid';

function topCategory(raw: string | null): string | null {
  if (!raw) return null;
  return raw.split('/')[0].trim();
}

function applyDateFilter(event: NearbyEvent, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const now = new Date();
  const date = new Date(event.starts_at);
  if (filter === 'today') {
    return date.toDateString() === now.toDateString();
  }
  if (filter === 'week') {
    const weekOut = new Date(now);
    weekOut.setDate(now.getDate() + 7);
    return date >= now && date <= weekOut;
  }
  if (filter === 'weekend') {
    const day = date.getDay();
    return (day === 6 || day === 0) && date >= now;
  }
  return true;
}

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
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('any');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const cat = topCategory(e.category);
      if (cat && cat !== 'undefined') counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat]) => cat);
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (!applyDateFilter(e, dateFilter)) return false;
      if (priceFilter === 'free' && !(e.price_min === 0 && (e.price_max === 0 || e.price_max === null))) return false;
      if (priceFilter === 'paid' && e.price_min === 0 && (e.price_max === 0 || e.price_max === null)) return false;
      if (activeCategory && topCategory(e.category) !== activeCategory) return false;
      return true;
    });
  }, [events, dateFilter, priceFilter, activeCategory]);

  const DATE_CHIPS: { label: string; value: DateFilter }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Weekend', value: 'weekend' },
    { label: 'This Week', value: 'week' },
  ];

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.heading}>Nearby Events</Text>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {DATE_CHIPS.map((chip) => {
          const active = dateFilter === chip.value;
          return (
            <Pressable
              key={chip.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setDateFilter(active ? 'all' : chip.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}

        <Pressable
          style={[styles.chip, priceFilter === 'free' && styles.chipActive]}
          onPress={() => setPriceFilter(priceFilter === 'free' ? 'any' : 'free')}
        >
          <Text style={[styles.chipText, priceFilter === 'free' && styles.chipTextActive]}>Free</Text>
        </Pressable>

        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setActiveCategory(active ? null : cat)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 6,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  chipsScroll: {
    flexGrow: 0,
    overflow: 'visible',
  },
  chips: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  chipText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
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
