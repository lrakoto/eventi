import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import SearchOverlay from '@/components/SearchOverlay';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { EventSheetProvider, useEventSheet } from '@/lib/EventSheetContext';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { applyFilters, FilterProvider, useFilters } from '@/lib/FilterContext';
import EventBottomSheet from '@/components/EventBottomSheet';
import PersistentListSheet from '@/components/PersistentListSheet';
import { EventsProvider, useNearbyEvents } from '@/lib/EventsContext';
import { supabase } from '@/lib/supabase';
import { SHEET_HEIGHT } from '@/constants/layout';

type DeleteAccountResult = {
  ok: true;
  appleRevocation?: 'revoked' | 'no_token' | 'failed' | 'not_applicable';
};

const APPLE_SIGN_IN_HELP_URL = 'https://support.apple.com/en-us/102571';

export const unstable_settings = {
  anchor: '(tabs)',
};

function TopNav() {
  const router = useRouter();
  const { session } = useAuth();
  const deletingAccount = useRef(false);

  function handleMenuPress() {
    Alert.alert('EventAlly', undefined, [
      { text: 'Privacy Policy', onPress: () => router.push('/privacy') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleAccountPress() {
    if (deletingAccount.current) return;
    if (session) {
      Alert.alert('Account', session.user.email ?? 'Signed in', [
        { text: 'Sign out', onPress: () => supabase.auth.signOut() },
        { text: 'Delete account', style: 'destructive', onPress: confirmDeleteAccount },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      router.push('/auth');
    }
  }

  function confirmDeleteAccount() {
    const user = session?.user;
    const usesApple = user?.app_metadata.provider === 'apple'
      || user?.app_metadata.providers?.includes('apple')
      || user?.identities?.some((identity) => identity.provider === 'apple');

    Alert.alert(
      'Delete account?',
      'This permanently deletes your EventAlly account, saved events, and any past community posts. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            if (deletingAccount.current) return;
            deletingAccount.current = true;
            try {
              const { data, error } = await supabase.functions.invoke<DeleteAccountResult>('delete-account');
              if (error || !data?.ok) {
                Alert.alert('Could not confirm deletion', 'Please try again or contact support from the Privacy Policy.');
                return;
              }

              const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
                .catch((error: unknown) => ({ error }));
              if (signOutError) console.warn('Could not clear the local session after account deletion');

              const needsAppleSteps = data.appleRevocation === 'no_token'
                || data.appleRevocation === 'failed'
                || (usesApple && !data.appleRevocation);
              if (needsAppleSteps) {
                Alert.alert(
                  'EventAlly account deleted',
                  'To finish removing Apple access, open iPhone Settings, tap your name, then Sign in with Apple. Select the app or developer entry and tap Delete.',
                  [
                    { text: 'Done', style: 'cancel' },
                    { text: 'Apple instructions', onPress: () => {
                      Linking.openURL(APPLE_SIGN_IN_HELP_URL).catch(() => {
                        Alert.alert('Could not open Apple Support', 'You can follow the steps from iPhone Settings.');
                      });
                    } },
                  ],
                );
              } else {
                Alert.alert('Account deleted', 'Your EventAlly account and data have been removed.');
              }
            } catch {
              Alert.alert('Could not confirm deletion', 'Please try again or contact support from the Privacy Policy.');
            } finally {
              deletingAccount.current = false;
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Menu" style={styles.iconBtn} onPress={handleMenuPress}>
          <MaterialIcons name="menu" size={26} color="#111" />
        </Pressable>
        <Text style={styles.appName}>EventAlly</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Account" style={styles.iconBtn} onPress={handleAccountPress}>
          <MaterialIcons name={session ? 'person' : 'person-outline'} size={26} color="#111" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Portals() {
  const { selectedEvent, closeSheet } = useEventSheet();
  const { area, events } = useNearbyEvents();
  const filters = useFilters();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const searchTerm = query.trim().toLowerCase();
  const searchResults = searchTerm
    ? events.filter((e) =>
        e.title.toLowerCase().includes(searchTerm) ||
        (e.venue_name ?? '').toLowerCase().includes(searchTerm) ||
        (e.address ?? '').toLowerCase().includes(searchTerm)
      )
    : events;

  return (
    <>
      {!selectedEvent && <PersistentListSheet events={events} />}
      <EventBottomSheet event={selectedEvent} onClose={closeSheet} />

      {/* Floating pill search bar */}
      {!isSearching && !selectedEvent && events.length > 0 && (
        <Pressable
          style={styles.searchBar}
          onPress={() => setIsSearching(true)}
        >
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>
            Search events or venues…
          </Text>
        </Pressable>
      )}

      {/* Full-screen search overlay */}
      {isSearching && (
        <SearchOverlay
          query={query}
          onChangeQuery={setQuery}
          onClose={() => { setIsSearching(false); setQuery(''); }}
          events={applyFilters(searchResults, filters, area.timeZone)}
        />
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
      <EventsProvider>
      <FilterProvider>
      <EventSheetProvider>
        {inTabs && <TopNav />}
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="privacy" options={{ presentation: 'modal', title: 'Privacy Policy' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        {inTabs && <Portals />}
      </EventSheetProvider>
      </FilterProvider>
      </EventsProvider>
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
});
