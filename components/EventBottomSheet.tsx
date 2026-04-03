import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { openURL } from 'expo-linking';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SHEET_HEIGHT } from '@/constants/layout';

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

function DirButton({ address, venueName, style }: {
  address: string | null;
  venueName: string | null;
  style?: object;
}) {
  return (
    <Pressable
      style={[styles.dirBtn, style]}
      onPress={() => openDirections(address, venueName)}
    >
      <Text style={styles.dirBtnText}>Directions</Text>
    </Pressable>
  );
}

function TicketButton({ url, style }: { url: string; style?: object }) {
  return (
    <Pressable style={[styles.button, style]} onPress={() => openURL(url)}>
      <Text style={styles.buttonText}>Get Tickets</Text>
    </Pressable>
  );
}

function renderFooter(price: string | null, hasDir: boolean, event: EventSummary) {
  const hasTickets = !!event.url;

  if (price) {
    // Price left, buttons right
    return (
      <View style={styles.footer}>
        <Text style={styles.price}>{price}</Text>
        <View style={styles.actions}>
          {hasDir && <DirButton address={event.address} venueName={event.venue_name} />}
          {hasTickets && <TicketButton url={event.url!} />}
        </View>
      </View>
    );
  }

  if (hasDir && hasTickets) {
    // Directions left, tickets right
    return (
      <View style={styles.footer}>
        <DirButton address={event.address} venueName={event.venue_name} />
        <TicketButton url={event.url!} />
      </View>
    );
  }

  if (hasDir || hasTickets) {
    // Single item — centered
    return (
      <View style={[styles.footer, styles.footerCentered]}>
        {hasDir
          ? <DirButton address={event.address} venueName={event.venue_name} style={styles.btnFull} />
          : <TicketButton url={event.url!} style={styles.btnFull} />
        }
      </View>
    );
  }

  return null;
}

function openDirections(address: string | null, venueName: string | null) {
  const query = encodeURIComponent(address ?? venueName ?? '');
  Linking.openURL(`maps://maps.apple.com/?q=${query}`);
}

export default function EventBottomSheet({ event, onClose }: Props) {
  if (!event) return null;

  const price = formatPrice(event.price_min, event.price_max, event.currency);
  const hasDir = !!(event.address || event.venue_name);

  return (
    <View style={styles.sheet}>
      <View style={styles.imageContainer}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <BlurView intensity={60} tint="dark" style={styles.blurView}>
            <Text style={styles.closeIcon}>✕</Text>
          </BlurView>
        </Pressable>
      </View>

      <View style={styles.content}>
        {event.category && (
          <Text style={styles.category}>{event.category.toUpperCase()}</Text>
        )}
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.meta}>{formatDate(event.starts_at)}</Text>
        {event.venue_name && <Text style={styles.meta}>{event.venue_name}</Text>}
        {event.address && (
          <Text style={styles.address} numberOfLines={1}>{event.address}</Text>
        )}

        {renderFooter(price, hasDir, event)}
      </View>
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
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 150,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  blurView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 4,
    flex: 1,
  },
  category: {
    fontSize: 11,
    color: '#888',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    color: '#444',
    marginTop: 3,
  },
  address: {
    fontSize: 12,
    color: '#888',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  footerCentered: {
    justifyContent: 'center',
  },
  btnFull: {
    flex: 1,
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  dirBtn: {
    borderWidth: 1.5,
    borderColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dirBtnText: {
    color: '#111',
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    borderWidth: 1.5,
    borderColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#111',
    fontWeight: '600',
    fontSize: 14,
  },
});
