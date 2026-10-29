import { router } from 'expo-router';
import { ActivityIndicator, Alert, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useMyMovies } from '@/hooks/use-my-movies';
import { signOut } from '@/services/auth-service';
import { messageOf } from '@/services/errors';
import type { WatchedMovie } from '@/services/watched-service';

export default function MyListScreen() {
  const { ranked, unranked, loading, error, refreshing, refresh, reload } = useMyMovies();
  const sections = [
    { title: 'Your ranking', data: ranked },
    { title: 'Watched, not ranked yet', data: unranked },
  ].filter((section) => section.data.length > 0);

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" accessibilityRole="header">
            My List
          </ThemedText>
          <View style={styles.headerActions}>
            <Button label="About" variant="plain" size="small" onPress={() => router.push('/about')} />
            <Button
              label="Sign out"
              variant="plain"
              size="small"
              onPress={() => signOut().catch((e) => Alert.alert('Couldn’t sign out', messageOf(e)))}
            />
          </View>
        </View>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        {loading ? (
          <ActivityIndicator style={styles.loading} accessibilityLabel="Loading your list" />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.movie.id)}
            renderSectionHeader={({ section }) => (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
            )}
            renderItem={({ item }) => <WatchedRow item={item} />}
            ItemSeparatorComponent={ListSeparator}
            ListEmptyComponent={error ? undefined : EmptyList}
            refreshing={refreshing}
            onRefresh={refresh}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function WatchedRow({ item }: { item: WatchedMovie }) {
  const { movie, rankPosition, review } = item;
  const params = { movieId: String(movie.id) };
  const rankLabel = rankPosition ? 'Re-rank' : 'Rank';
  const reviewLabel = review ? 'Edit review' : 'Review';

  return (
    <MovieCard movie={movie} rank={rankPosition ?? undefined} note={review ? 'Reviewed' : undefined}>
      <Button
        size="small"
        variant="secondary"
        label={reviewLabel}
        accessibilityLabel={`${reviewLabel}: ${movie.title}`}
        onPress={() => router.push({ pathname: '/review/[movieId]', params })}
      />
      <Button
        size="small"
        label={rankLabel}
        accessibilityLabel={`${rankLabel} ${movie.title}`}
        onPress={() => router.push({ pathname: '/rank/[movieId]', params })}
      />
    </MovieCard>
  );
}

function EmptyList() {
  return (
    <View style={styles.empty}>
      <ThemedText>Nothing here yet.</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Find a movie you’ve watched, mark it watched, and rank it.
      </ThemedText>
      <Button label="Search movies" onPress={() => router.navigate('/search')} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
  },
  loading: {
    marginTop: Spacing.five,
  },
  list: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
  sectionTitle: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  empty: {
    gap: Spacing.three,
    paddingTop: Spacing.five,
    alignItems: 'flex-start',
  },
});
