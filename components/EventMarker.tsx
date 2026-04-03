import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { NearbyEvent } from '@/hooks/useNearbyEvents';

type Props = {
  event: NearbyEvent;
  selected: boolean;
  onPress: () => void;
};

export default function EventMarker({ event, selected, onPress }: Props) {
  return (
    <Marker
      coordinate={{ latitude: event.lat, longitude: event.lng }}
      onPress={onPress}
      tracksViewChanges={selected}
    >
      <View style={[styles.pin, selected && styles.pinSelected]}>
        <MaterialIcons
          name="location-on"
          size={selected ? 28 : 22}
          color={selected ? '#FF385C' : '#333'}
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pinSelected: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    borderColor: 'rgba(255,56,92,0.3)',
    borderWidth: 1.5,
  },
});
