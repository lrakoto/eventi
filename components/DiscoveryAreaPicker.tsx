import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DISCOVERY_CITIES, useNearbyEvents } from '@/lib/EventsContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAreaChanged: () => void;
};

export default function DiscoveryAreaPicker({ visible, onClose, onAreaChanged }: Props) {
  const { area, chooseCity, requestDeviceLocation, cancelLocationLookup, locating, locationError } = useNearbyEvents();

  function dismiss() {
    cancelLocationLookup();
    onClose();
  }

  async function selectDeviceLocation() {
    if (await requestDeviceLocation()) {
      onAreaChanged();
      onClose();
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={dismiss}>
      <View style={styles.modal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessible={false} />
        <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Choose an area</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close area picker" onPress={dismiss} style={styles.close}>
              <MaterialIcons name="close" size={24} color="#111" />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: locating, disabled: locating, selected: area.kind === 'device' }}
            disabled={locating}
            onPress={selectDeviceLocation}
            style={styles.row}
          >
            <MaterialIcons name="my-location" size={20} color="#2563EB" />
            <Text style={[styles.rowLabel, styles.locationLabel]}>{locating ? 'Finding your location…' : 'Use My Location'}</Text>
            {locating ? <ActivityIndicator /> : area.kind === 'device' && <Checkmark />}
          </Pressable>
          {locationError && (
            <View style={styles.locationError}>
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {locationError === 'permission'
                  ? 'Allow location access in Settings, or choose a city below.'
                  : 'Your location is unavailable. Try again or choose a city below.'}
              </Text>
              {locationError === 'permission' && (
                <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings().catch(() => {})} hitSlop={8}>
                  <Text style={styles.locationLabel}>Open Settings</Text>
                </Pressable>
              )}
            </View>
          )}
          {DISCOVERY_CITIES.map((city) => {
            const selected = area === city;
            return (
              <Pressable
                key={city.name}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  chooseCity(city);
                  onAreaChanged();
                  onClose();
                }}
                style={styles.row}
              >
                <MaterialIcons name="place" size={20} color="#666" />
                <Text style={styles.rowLabel}>{city.name}</Text>
                {selected && <Checkmark />}
              </Pressable>
            );
          })}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Checkmark() {
  return <MaterialIcons name="check" size={20} color="#2563EB" />;
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#111' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  rowLabel: { flex: 1, fontSize: 16, color: '#111' },
  locationLabel: { fontWeight: '600', color: '#2563EB' },
  locationError: { paddingTop: 8, paddingBottom: 12, gap: 8 },
  errorText: { color: '#555', fontSize: 14 },
});
