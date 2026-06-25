import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import SearchOverlay from '@/components/SearchOverlay';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { EventSheetProvider, useEventSheet } from '@/lib/EventSheetContext';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import EventBottomSheet from '@/components/EventBottomSheet';
import PersistentListSheet from '@/components/PersistentListSheet';
import { useNearbyEvents } from '@/hooks/useNearbyEvents';
import { SHEET_HEIGHT } from '@/constants/layout';
import { supabase } from '@/lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

function TopNav() {
  const router = useRouter();
  const { session } = useAuth();

  function handleAccountPress() {
    if (session) {
      Alert.alert('Account', session.user.email ?? 'Signed in', [
        { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      router.push('/auth');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.nav}>
        <Pressable style={styles.iconBtn} onPress={() => alert('Menu coming soon')}>
          <MaterialIcons name="menu" size={26} color="#111" />
        </Pressable>
        <Text style={styles.appName}>Eventi</Text>
        <Pressable style={styles.iconBtn} onPress={handleAccountPress}>
          <MaterialIcons name={session ? 'person' : 'person-outline'} size={26} color="#111" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Portals() {
  const { selectedEvent, closeSheet } = useEventSheet();
  const { events, userLocation } = useNearbyEvents();
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onMapTab = segments[segments.length - 1] !== 'explore';
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  function handleAddEvent() {
    if (!session) {
      router.push('/auth');
    } else {
      router.push('/add-event');
    }
  }

  const filteredEvents = query.trim()
    ? events.filter((e) =>
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        (e.venue_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (e.address ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : events;

  const showSheet = onMapTab && !selectedEvent && userLocation;

  return (
    <>
      {showSheet && (
        <PersistentListSheet
          events={filteredEvents}
          userLat={userLocation.latitude}
          userLng={userLocation.longitude}
        />
      )}
      <EventBottomSheet event={selectedEvent} onClose={closeSheet} />

      {/* Floating pill search bar */}
      {!isSearching && (
        <Pressable
          style={styles.searchBar}
          onPress={() => setIsSearching(true)}
        >
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>
            {query || 'Search events, venues, cities…'}
          </Text>
        </Pressable>
      )}

      {/* Full-screen search overlay */}
      {isSearching && (
        <SearchOverlay
          query={query}
          onChangeQuery={setQuery}
          onClose={() => { setIsSearching(false); setQuery(''); }}
          events={filteredEvents}
        />
      )}

      {/* Add Event FAB */}
      {!isSearching && !selectedEvent && (
        <Pressable style={styles.fab} onPress={handleAddEvent}>
          <MaterialIcons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const inTabs = segments[0] === '(tabs)';

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
      <EventSheetProvider>
        {inTabs && <TopNav />}
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="add-event" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        <Portals />
      </EventSheetProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    position: 'absolute',
    bottom: SHEET_HEIGHT + 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    bottom: SHEET_HEIGHT + 70,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
