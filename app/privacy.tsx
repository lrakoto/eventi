import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import policy from '@/constants/privacy-policy.json';

// Single source for the in-app screen and the hosted page
// (npm run build:privacy → docs/privacy.html, deployed by GitHub Pages).
export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {policy.sections.map((s) => (
        <Text key={s.heading} style={styles.section}>
          <Text style={styles.heading}>{s.heading}{'\n'}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </Text>
      ))}
      <Text style={styles.section}>
        <Text style={styles.heading}>Contact{'\n'}</Text>
        <Text style={styles.body}>Questions or requests: </Text>
        <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${policy.contactEmail}`)}>
          {policy.contactEmail}
        </Text>
      </Text>
      <Text style={styles.updated}>Last updated {policy.lastUpdated}</Text>
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
