import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { confirmAction } from '@/components/confirm';
import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type SavedRankingNotice, takeSavedRankingNotice } from '@/hooks/saved-ranking-notice';
import { useMyMovies } from '@/hooks/use-my-movies';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/services/auth-service';
import { messageOf } from '@/services/errors';
import { removeWatched, type WatchedMovie } from '@/services/watched-service';

/** How long a just-ranked movie stays highlighted. */
const HIGHLIGHT_MS = 3000;

export default function MyListScreen() {
  const theme = useTheme();
  const { ranked, unranked, loading, error, refreshing, refresh, reload } = useMyMovies();
  const listRef = useRef<SectionList<WatchedMovie>>(null);
  const [saved, setSaved] = useState<SavedRankingNotice | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Movies waiting to be ranked come first, so the next step is at the top
  // however long the ranking gets (#50).
  const sections = [
    { title: `Waiting to be ranked (${unranked.length})`, data: unranked },
    { title: 'Your ranking', data: ranked },
  ].filter((section) => section.data.length > 0);

  // A ranking saved on the Rank screen shows up here once (#51).
  useFocusEffect(
    useCallback(() => {
      const notice = takeSavedRankingNotice();
      if (notice) {
        setSaved(notice);
        setHighlightId(notice.movieId);
      }
    }, []),
  );

  // Once the reloaded list has the movie in its saved place, scroll to it.
  const savedIndex = saved ? ranked.findIndex((m) => m.movie.id === saved.movieId) : -1;
  const savedInPlace = saved !== null && savedIndex === saved.position - 1;
  const rankingSection = unranked.length > 0 ? 1 : 0;
  useEffect(() => {
    if (!savedInPlace) {
      return;
    }
    listRef.current?.scrollToLocation({ sectionIndex: rankingSection, itemIndex: savedIndex, viewPosition: 0.3 });
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [savedInPlace, savedIndex, rankingSection]);

  async function remove(item: WatchedMovie) {
    const { movie, rankPosition, review } = item;
    const lost = [rankPosition && `its #${rankPosition} spot`, review && 'your review'].filter(Boolean).join(' and ');
    const confirmed = await confirmAction(
      `Remove ${movie.title}?`,
      lost ? `This also deletes ${lost}.` : 'You can add it again from Search.',
      'Remove',
    );
    if (!confirmed) {
      return;
    }
    try {
      await removeWatched(movie.id);
      if (saved?.movieId === movie.id) {
        setSaved(null);
      }
      await reload();
    } catch (e) {
      Alert.alert('Couldn’t remove the movie', messageOf(e));
    }
  }

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
        {saved && (
          <View style={[styles.notice, { backgroundColor: theme.accentSoft }]} accessibilityRole="alert">
            <ThemedText type="small" style={styles.noticeText}>
              Saved {saved.title} at #{saved.position}.
            </ThemedText>
            <Button label="OK" variant="plain" size="small" accessibilityLabel="Dismiss" onPress={() => setSaved(null)} />
          </View>
        )}
        {loading ? (
          <ActivityIndicator style={styles.loading} accessibilityLabel="Loading your list" />
        ) : (
          <SectionList
            ref={listRef}
            sections={sections}
            keyExtractor={(item) => String(item.movie.id)}
            renderSectionHeader={({ section }) => (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
            )}
            renderItem={({ item }) => (
              <WatchedRow item={item} highlighted={item.movie.id === highlightId} onRemove={() => remove(item)} />
            )}
            ItemSeparatorComponent={ListSeparator}
            ListEmptyComponent={error ? undefined : EmptyList}
            refreshing={refreshing}
            onRefresh={refresh}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            // Rows far down a long list may not be measured yet; try again once they are.
            onScrollToIndexFailed={({ index }) =>
              setTimeout(
                () =>
                  listRef.current?.scrollToLocation({
                    sectionIndex: rankingSection,
                    itemIndex: index,
                    viewPosition: 0.3,
                  }),
                250,
              )
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

type WatchedRowProps = {
  item: WatchedMovie;
  highlighted: boolean;
  onRemove: () => void;
};

function WatchedRow({ item, highlighted, onRemove }: WatchedRowProps) {
  const { movie, rankPosition, review } = item;
  const params = { movieId: String(movie.id) };
  const rankLabel = rankPosition ? 'Re-rank' : 'Rank';
  const reviewLabel = review ? 'Edit review' : 'Review';

  return (
    <MovieCard
      movie={movie}
      rank={rankPosition ?? undefined}
      note={review ? 'Reviewed' : undefined}
      highlighted={highlighted}>
      <Button
        size="small"
        variant="plain"
        label="Remove"
        accessibilityLabel={`Remove ${movie.title} from your list`}
        onPress={onRemove}
      />
      <Button
        size="small"
        variant="secondary"
        label={reviewLabel}
        accessibilityLabel={`${reviewLabel}: ${movie.title}`}
        onPress={() => router.push({ pathname: '/review/[movieId]', params })}
      />
      <Button
        size="small"
        // An unranked movie's next step is ranking it, so that button is filled.
        variant={rankPosition ? 'secondary' : 'primary'}
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
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.three,
    borderRadius: 12,
  },
  noticeText: {
    flex: 1,
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
