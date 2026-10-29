import { Image } from 'expo-image';
import { Linking, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const TMDB_URL = 'https://www.themoviedb.org';

/** About and credits, including the attribution TMDB's terms require. */
export default function AboutScreen() {
  return (
    <ThemedView style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle" themeColor="accentText" accessibilityRole="header">
          Encore
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Rank the movies you watch by choosing between two at a time. Built for CSE 403 at the University
          of Washington.
        </ThemedText>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          Movie data
        </ThemedText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="The Movie Database (TMDB) website"
          onPress={() => Linking.openURL(TMDB_URL)}
          style={styles.logoLink}>
          <Image
            source={require('@/assets/images/tmdb-logo.svg')}
            style={styles.logo}
            contentFit="contain"
            accessible={false}
          />
        </Pressable>
        <ThemedText type="small">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  sectionTitle: {
    paddingTop: Spacing.three,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  logoLink: {
    alignSelf: 'flex-start',
  },
  // TMDB's short logo is 273.42 × 35.52; keep it smaller than the Encore name.
  logo: {
    width: 140,
    height: 18,
  },
});
