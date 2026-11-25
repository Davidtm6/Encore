import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';

import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useFriendProfile } from '@/hooks/use-friend-profile';
import type { WatchedMovie } from '@/services/watched-service';

/** A friend's account page: their ranking, best first, with their reviews, then films they haven't ranked. */
export default function FriendProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { person, relation, ranked, unranked, loading, error, refreshing, refresh, reload } = useFriendProfile(userId);
  const name = person?.username ?? 'Friend';

  const sections = [
    { title: `${name}’s ranking (${ranked.length})`, data: ranked },
    { title: `Watched, not ranked yet (${unranked.length})`, data: unranked },
  ].filter((section) => section.data.length > 0);

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: name }} />
      <View style={styles.page}>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        {loading ? (
          <ActivityIndicator style={styles.loading} accessibilityLabel={`Loading ${name}’s rankings`} />
        ) : relation !== 'friend' ? (
          !error && (
            <View style={styles.empty}>
              <ThemedText>You’re not friends with {name} yet.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {relation === 'youAdded'
                  ? `You’ll see ${name}’s rankings and reviews once they add you back.`
                  : `Add each other on the Friends tab to see each other’s rankings and reviews.`}
              </ThemedText>
            </View>
          )
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.movie.id)}
            renderSectionHeader={({ section }) => (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
            )}
            renderItem={({ item }) => <FriendMovieRow item={item} />}
            ItemSeparatorComponent={ListSeparator}
            ListEmptyComponent={
              error ? undefined : (
                <ThemedText themeColor="textSecondary" style={styles.empty}>
                  {name} hasn’t added any movies yet.
                </ThemedText>
              )
            }
            refreshing={refreshing}
            onRefresh={refresh}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </ThemedView>
  );
}

function FriendMovieRow({ item }: { item: WatchedMovie }) {
  const { movie, rankPosition, review } = item;
  return (
    <MovieCard movie={movie} rank={rankPosition ?? undefined} note={review ? 'Reviewed' : undefined}>
      {review ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.review}
          accessibilityLabel={`Review of ${movie.title}: ${review}`}>
          “{review}”
        </ThemedText>
      ) : null}
    </MovieCard>
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
  loading: {
    marginTop: Spacing.five,
  },
  sectionTitle: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  review: {
    flex: 1,
    fontStyle: 'italic',
  },
  empty: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  list: {
    paddingBottom: Spacing.five,
  },
});
