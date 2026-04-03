import { Image } from 'expo-image';
import { openURL } from 'expo-linking';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type EventSummary = {
  id: string;
  title: string;
  venue_name: string | null;
  address: string | null;
  starts_at: string;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  image_url: string | null;
  url: string | null;
  category: string | null;
};

type Props = {
  event: EventSummary | null;
  onClose: () => void;
};

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
  if (max && max !== min) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min);
}

export default function EventBottomSheet({ event, onClose }: Props) {
  const price = event
    ? formatPrice(event.price_min, event.price_max, event.currency)
    : null;

  return (
    <Modal
      visible={!!event}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {event && (
          <>
            {event.image_url && (
              <Image
                source={{ uri: event.image_url }}
                style={styles.image}
                contentFit="cover"
              />
            )}
            <View style={styles.content}>
              {event.category && (
                <Text style={styles.category}>{event.category.toUpperCase()}</Text>
              )}
              <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
              <Text style={styles.meta}>{formatDate(event.starts_at)}</Text>
              {event.venue_name && (
                <Text style={styles.meta}>{event.venue_name}</Text>
              )}
              {event.address && (
                <Text style={styles.address} numberOfLines={1}>{event.address}</Text>
              )}
              <View style={styles.footer}>
                {price && <Text style={styles.price}>{price}</Text>}
                {event.url && (
                  <Pressable style={styles.button} onPress={() => openURL(event.url!)}>
                    <Text style={styles.buttonText}>Get Tickets</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  image: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: 16,
    gap: 4,
  },
  category: {
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },
  meta: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  address: {
    fontSize: 13,
    color: '#888',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  button: {
    backgroundColor: '#111',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
