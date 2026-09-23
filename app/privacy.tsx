import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { PRIVACY_CONTACT_EMAIL } from '@/constants/config';

// Keep in sync with the hosted copy linked from App Store Connect.
const LAST_UPDATED = 'September 22, 2026';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Overview',
    body:
      'Eventi shows events happening near you on a map. This policy explains what information the app uses, why, and the choices you have. Eventi does not sell your data, show ads, or track you across other apps or websites.',
  },
  {
    heading: 'Location',
    body:
      'With your permission, Eventi uses your device location while the app is open to find nearby events. Your coordinates are sent to our backend only to look up events in your area, and occasionally to fetch fresh listings for that area. We do not store your location history or link your location to your account. You can turn off location access at any time in iOS Settings.',
  },
  {
    heading: 'Account information',
    body:
      'You can browse without an account. If you sign in with Apple or email, we store your email address (or Apple\'s private relay address) and a user ID so you can save events and post your own. Passwords are handled by our authentication provider and are never visible to us.',
  },
  {
    heading: 'Content you create',
    body:
      'Events you post (title, date, venue, address, description, price) are public and visible to other users. Events you save, reports you submit, and users you block are private to your account.',
  },
  {
    heading: 'Event listings',
    body:
      'Many listings come from Ticketmaster. Tapping "Get Tickets" opens Ticketmaster\'s website, which is governed by its own privacy policy. Directions open in Apple Maps.',
  },
  {
    heading: 'Service providers',
    body:
      'Eventi is hosted on Supabase (database, authentication, and server functions, located in the United States). Sign in with Apple is provided by Apple. These providers process data only to run the app.',
  },
  {
    heading: 'Moderation',
    body:
      'You can report events or block users from an event\'s detail sheet. Reported events are hidden for you immediately and reviewed; events reported by multiple users are removed from public view.',
  },
  {
    heading: 'Deleting your data',
    body:
      'You can delete your account at any time from the account menu (person icon → Delete account). This permanently removes your account, the events you posted, your saved events, reports, and blocks.',
  },
  {
    heading: 'Children',
    body: 'Eventi is not directed to children under 13, and we do not knowingly collect their information.',
  },
  {
    heading: 'Changes',
    body: 'If this policy changes, we will update the date below and, for significant changes, notify you in the app.',
  },
];

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {SECTIONS.map((s) => (
        <Text key={s.heading} style={styles.section}>
          <Text style={styles.heading}>{s.heading}{'\n'}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </Text>
      ))}
      <Text style={styles.section}>
        <Text style={styles.heading}>Contact{'\n'}</Text>
        <Text style={styles.body}>Questions or requests: </Text>
        <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`)}>
          {PRIVACY_CONTACT_EMAIL}
        </Text>
      </Text>
      <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60, gap: 18 },
  section: { lineHeight: 21 },
  heading: { fontSize: 16, fontWeight: '700', color: '#111' },
  body: { fontSize: 14, color: '#444' },
  link: { fontSize: 14, color: '#3B82F6' },
  updated: { fontSize: 12, color: '#999', marginTop: 8 },
});
