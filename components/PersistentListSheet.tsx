import { Image } from 'expo-image';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type NearbyEvent, useNearbyEvents } from '@/lib/EventsContext';
import { useEventSheet } from '@/lib/EventSheetContext';
import { useFilters, applyFilters, deriveCategories, type DateFilter } from '@/lib/FilterContext';
import { formatEventDate } from '@/lib/eventDates';
import { SHEET_HEIGHT } from '@/constants/layout';

const DATE_CHIPS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Weekend', value: 'weekend' },
  { label: 'Next 7 Days', value: 'week' },
];

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
};

export default function PersistentListSheet({ events }: Props) {
  const { area, loading, errorMsg, refresh } = useNearbyEvents();
  const { openSheet } = useEventSheet();
  const { dateFilter, priceFilter, activeCategory, setDateFilter, setPriceFilter, setActiveCategory, isActive, reset } =
    useFilters();

  const categories = useMemo(() => deriveCategories(events), [events]);

  const filtered = useMemo(
    () => applyFilters(events, { dateFilter, priceFilter, activeCategory }, area.timeZone),
    [events, dateFilter, priceFilter, activeCategory, area.timeZone],
  );

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          {area.kind === 'city' ? `${area.name} Events` : 'Nearby Events'}
        </Text>
        {(!loading && !errorMsg || filtered.length > 0) && <Text style={styles.count}>{filtered.length}</Text>}
        {isActive && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear filters" onPress={reset} hitSlop={8} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
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
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setDateFilter(active ? 'all' : chip.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}

        {(['free', 'paid'] as const).map((price) => {
          const active = priceFilter === price;
          return (
            <Pressable
              key={price}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setPriceFilter(active ? 'any' : price)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{price === 'free' ? 'Free' : 'Paid'}</Text>
            </Pressable>
          );
        })}

        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <Pressable
              key={cat}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
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

      {errorMsg && (
        <View style={styles.status}>
          <Text accessibilityLiveRegion="polite" style={styles.statusText}>
            {events.length > 0 ? 'Could not refresh events. Showing the last results.' : errorMsg}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void refresh()} hitSlop={8}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}
      {loading && (
        <View style={styles.status}>
          <ActivityIndicator size="small" />
          <Text accessibilityLiveRegion="polite" style={styles.statusText}>Loading events…</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const dist = distanceKm(area.latitude, area.longitude, item.lat, item.lng);
          const distLabel = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
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
                <Text style={styles.rowMeta} numberOfLines={1}>{formatEventDate(item.starts_at, area.timeZone)}</Text>
                {item.venue_name && (
                  <Text style={styles.rowMeta} numberOfLines={1}>{item.venue_name}</Text>
                )}
                <View style={styles.rowFooter}>
                  <Text style={styles.rowDist}>{distLabel} {area.kind === 'city' ? 'from city center' : 'away'}</Text>
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
          !loading && !errorMsg ? (
            <Text style={styles.emptyText}>
              {isActive && events.length > 0 ? 'No events match these filters.' : 'No upcoming events in this area.'}
            </Text>
          ) : null
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
  clearBtn: {
    marginLeft: 'auto',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
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
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
  },
  statusText: { flex: 1, fontSize: 13, color: '#444' },
  retryText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
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
