import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

const CATEGORIES = ['music', 'sports', 'arts', 'food', 'community', 'tech', 'outdoors', 'other'];

export default function AddEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEdit);

  // Load existing event for edit mode
  useEffect(() => {
    if (!id) return;
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { Alert.alert('Error', 'Could not load event.'); router.back(); return; }
        setTitle(data.title ?? '');
        setDate(new Date(data.starts_at));
        setVenueName(data.venue_name ?? '');
        setAddress(data.address ?? '');
        setDescription(data.description ?? '');
        setCategory(data.category ?? null);
        const free = data.price_min === 0 && (data.price_max === 0 || data.price_max === null);
        setIsFree(free);
        if (!free && data.price_min != null) setPrice(String(data.price_min));
        setLoadingEvent(false);
      });
  }, [id]);

  function onDateChange(_: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(false);
    if (selected) {
      setDate((prev) => {
        const next = new Date(selected);
        next.setHours(prev.getHours(), prev.getMinutes());
        return next;
      });
    }
  }

  function onTimeChange(_: DateTimePickerEvent, selected?: Date) {
    setShowTimePicker(false);
    if (selected) {
      setDate((prev) => {
        const next = new Date(prev);
        next.setHours(selected.getHours(), selected.getMinutes());
        return next;
      });
    }
  }

  async function handleSubmit() {
    if (!session) { Alert.alert('Sign in required'); return; }
    if (!title.trim()) { Alert.alert('Title is required'); return; }

    setLoading(true);
    try {
      // Geocode address → lat/lng
      let lat: number | null = null;
      let lng: number | null = null;

      if (address.trim()) {
        const results = await Location.geocodeAsync(address.trim());
        if (results.length > 0) {
          lat = results[0].latitude;
          lng = results[0].longitude;
        }
      }

      if (lat === null || lng === null) {
        // Fall back to user's current location
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const priceVal = isFree ? 0 : parseFloat(price) || 0;

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        starts_at: date.toISOString(),
        venue_name: venueName.trim() || null,
        address: address.trim() || null,
        location: `SRID=4326;POINT(${lng} ${lat})`,
        category: category ?? null,
        price_min: priceVal,
        price_max: priceVal,
        currency: 'USD',
        created_by: session.user.id,
        source: 'user',
      };

      if (isEdit) {
        const { error } = await supabase.from('events').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert({ ...payload, source_id: crypto.randomUUID() });
        if (error) throw error;
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingEvent) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialIcons name="close" size={22} color="#111" />
          </Pressable>
          <Text style={styles.heading}>{isEdit ? 'Edit Event' : 'Add Event'}</Text>
          <Pressable onPress={handleSubmit} style={styles.saveBtn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </Pressable>
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="What's happening?"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Date & Time *</Text>
        <View style={styles.row}>
          <Pressable style={[styles.input, styles.flex]} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerText}>{dateLabel}</Text>
          </Pressable>
          <Pressable style={[styles.input, styles.timeInput]} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.pickerText}>{timeLabel}</Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker mode="date" value={date} onChange={onDateChange} minimumDate={new Date()} />
        )}
        {showTimePicker && (
          <DateTimePicker mode="time" value={date} onChange={onTimeChange} />
        )}

        <Text style={styles.label}>Venue Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Venue or organiser name"
          value={venueName}
          onChangeText={setVenueName}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Street address, city (used for map pin)"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <View style={styles.catRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(active ? null : cat)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Text style={styles.label}>Price</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Free</Text>
          <Switch value={isFree} onValueChange={setIsFree} />
        </View>
        {!isFree && (
          <TextInput
            style={styles.input}
            placeholder="Price (USD)"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell people about this event…"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  heading: { fontSize: 17, fontWeight: '700', color: '#111' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, backgroundColor: '#fafafa',
  },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  timeInput: { width: 110 },
  pickerText: { fontSize: 15, color: '#111' },
  textArea: { height: 100, textAlignVertical: 'top' },
  catScroll: { marginBottom: 4 },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { fontSize: 13, color: '#444', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  priceLabel: { fontSize: 15, color: '#111' },
});
