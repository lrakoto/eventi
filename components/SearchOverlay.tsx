import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NearbyEvent } from '@/hooks/useNearbyEvents';
import { useEventSheet } from '@/lib/EventSheetContext';
import { SHEET_HEIGHT } from '@/constants/layout';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Starting Y offset — positions overlay near where the pill lives
const START_TRANSLATE_Y = SCREEN_HEIGHT - SHEET_HEIGHT - 80;

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

type Props = {
  query: string;
  onChangeQuery: (q: string) => void;
  onClose: () => void;
  events: NearbyEvent[];
};

export default function SearchOverlay({ query, onChangeQuery, onClose, events }: Props) {
  const inputRef = useRef<TextInput>(null);
  const { openSheet } = useEventSheet();

  const translateY = useRef(new Animated.Value(START_TRANSLATE_Y)).current;

  useEffect(() => {
    inputRef.current?.focus();
    Animated.spring(translateY, {
      toValue: 0,
      damping: 26,
      stiffness: 260,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, []);

  function handleSelect(event: NearbyEvent) {
    onClose();
    openSheet(event);
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.flex}>
          {/* Search bar with X inside */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search events, venues, cities…"
                placeholderTextColor="#999"
                value={query}
                onChangeText={onChangeQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
              <Pressable onPress={onClose} hitSlop={12}>
                <MaterialIcons name="close" size={20} color="#999" />
              </Pressable>
            </View>
          </View>

          <Text style={styles.resultCount}>
            {events.length} {events.length === 1 ? 'event' : 'events'} found
          </Text>

          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const price = formatPrice(item.price_min, item.price_max, item.currency);
              return (
                <Pressable style={styles.row} onPress={() => handleSelect(item)}>
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
                    {price && <Text style={styles.rowPrice}>{price}</Text>}
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#ccc" />
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialIcons name="search-off" size={40} color="#ddd" />
                <Text style={styles.emptyText}>No events found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
  },
  flex: { flex: 1 },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    padding: 0,
  },
  resultCount: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  thumbPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  rowMeta: {
    fontSize: 12,
    color: '#666',
  },
  rowPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
});
