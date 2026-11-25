import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, SectionList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { confirmAction } from '@/components/confirm';
import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { MovieCard } from '@/components/movie-card';
import { PosterGridTile } from '@/components/poster-grid-tile';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type SavedRankingNotice, takeSavedRankingNotice } from '@/hooks/saved-ranking-notice';
import { useMyMovies } from '@/hooks/use-my-movies';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/services/auth-service';
import { messageOf } from '@/services/errors';
import {
  chunk,
  gridColumns,
  type ListSort,
  type ListView,
  listSections,
  locate,
  readChoice,
  SORT_OPTIONS,
  VIEW_OPTIONS,
} from '@/services/my-list-layout';
import type { WatchedMovie } from '@/services/watched-service';

/** How long a just-ranked movie stays highlighted. */
const HIGHLIGHT_MS = 3000;

/** What each section of My List carries besides its films. */
type SectionInfo = { key: string; title: string };

/** Space between grid tiles. */
const GRID_GAP = Spacing.two;

/** Where this device remembers the chosen view and sort (#82). */
const VIEW_KEY = 'encore.myList.view';
const SORT_KEY = 'encore.myList.sort';

/**
 * The view and sort, remembered on this device. Storage is a convenience: if
 * it can't be read or written, the list still works with the defaults.
 */
function useListChoices() {
  const [view, setView] = useState<ListView>('list');
  const [sort, setSort] = useState<ListSort>('score');

  useEffect(() => {
    AsyncStorage.multiGet([VIEW_KEY, SORT_KEY])
      .then(([[, savedView], [, savedSort]]) => {
        setView(readChoice(savedView, VIEW_OPTIONS, 'list'));
        setSort(readChoice(savedSort, SORT_OPTIONS, 'score'));
      })
      .catch(() => {});
  }, []);

  function choose<T extends string>(key: string, set: (value: T) => void) {
    return (value: T) => {
      set(value);
      AsyncStorage.setItem(key, value).catch(() => {});
    };
  }

  return { view, sort, setView: choose<ListView>(VIEW_KEY, setView), setSort: choose<ListSort>(SORT_KEY, setSort) };
}

/**
 * Sign out sits next to About and is easy to tap by accident (#69), so it asks
 * first, like removing a movie does.
 */
async function confirmSignOut() {
  const confirmed = await confirmAction(
    'Sign out?',
    'You’ll need your email and password to sign back in.',
    'Sign out',
    'Cancel',
  );
  if (!confirmed) {
    return;
  }
  try {
    await signOut();
  } catch (e) {
    Alert.alert('Couldn’t sign out', messageOf(e));
  }
}

export default function MyListScreen() {
  const theme = useTheme();
  const { ranked, unranked, loading, error, refreshing, refresh, reload } = useMyMovies();
  const { view, sort, setView, setSort } = useListChoices();
  const listRef = useRef<SectionList<WatchedMovie, SectionInfo>>(null);
  const gridRef = useRef<SectionList<WatchedMovie[], SectionInfo>>(null);
  const [saved, setSaved] = useState<SavedRankingNotice | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // By score, movies waiting to be ranked come first, so the next step is at
  // the top however long the ranking gets (#50).
  const sections = listSections([...unranked, ...ranked], sort);
  // The grid shows the same sections, a row of posters at a time.
  const { width } = useWindowDimensions();
  const columns = gridColumns(Math.min(width, MaxContentWidth) - Spacing.three * 2, GRID_GAP);
  const gridSections = sections.map((section) => ({ ...section, data: chunk(section.data, columns) }));

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

  // Once the reloaded list has the movie in its saved place, scroll to it,
  // in whichever view and sort is showing.
  const savedIndex = saved ? ranked.findIndex((m) => m.movie.id === saved.movieId) : -1;
  const savedInPlace = saved !== null && savedIndex === saved.position - 1;
  const found = savedInPlace ? locate(sections, saved.movieId) : null;
  const target = found && (view === 'grid' ? { ...found, itemIndex: Math.floor(found.itemIndex / columns) } : found);
  const sectionIndex = target?.sectionIndex ?? -1;
  const itemIndex = target?.itemIndex ?? -1;
  const scrollToSaved = useCallback(() => {
    if (sectionIndex === -1) {
      return;
    }
    const location = { sectionIndex, itemIndex, viewPosition: 0.3 };
    (view === 'grid' ? gridRef : listRef).current?.scrollToLocation(location);
  }, [view, sectionIndex, itemIndex]);
  useEffect(() => {
    if (sectionIndex === -1) {
      return;
    }
    scrollToSaved();
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [sectionIndex, scrollToSaved]);

  const sectionHeader = ({ section }: { section: SectionInfo }) => (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
      {section.title}
    </ThemedText>
  );
  // Rows far down a long list may not be measured yet; try again once they are.
  const retryScroll = () => setTimeout(scrollToSaved, 250);

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
              onPress={confirmSignOut}
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
        {!loading && sections.length > 0 && (
          <View style={styles.controls}>
            <SegmentedControl label="View" options={VIEW_OPTIONS} value={view} onChange={setView} />
            <SegmentedControl label="Sort by" options={SORT_OPTIONS} value={sort} onChange={setSort} />
          </View>
        )}
        {loading ? (
          <ActivityIndicator style={styles.loading} accessibilityLabel="Loading your list" />
        ) : view === 'grid' ? (
          <SectionList
            ref={gridRef}
            sections={gridSections}
            keyExtractor={(row) => row.map((item) => item.movie.id).join('-')}
            renderSectionHeader={sectionHeader}
            renderItem={({ item: row }) => (
              <View style={styles.gridRow}>
                {row.map((item) => (
                  <PosterGridTile
                    key={item.movie.id}
                    movie={item.movie}
                    rank={item.rankPosition}
                    score={item.score}
                    reviewed={item.review !== null}
                    highlighted={item.movie.id === highlightId}
                    onPress={() => openMovie(item.movie.id)}
                  />
                ))}
                {/* Empty cells keep a short last row's posters the same width as the rest. */}
                {Array.from({ length: columns - row.length }, (_, i) => (
                  <View key={`empty-${i}`} style={styles.gridSpacer} />
                ))}
              </View>
            )}
            ListEmptyComponent={error ? undefined : EmptyList}
            refreshing={refreshing}
            onRefresh={refresh}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            onScrollToIndexFailed={retryScroll}
          />
        ) : (
          <SectionList
            ref={listRef}
            sections={sections}
            keyExtractor={(item) => String(item.movie.id)}
            renderSectionHeader={sectionHeader}
            renderItem={({ item }) => (
              <WatchedRow item={item} highlighted={item.movie.id === highlightId} />
            )}
            ItemSeparatorComponent={ListSeparator}
            ListEmptyComponent={error ? undefined : EmptyList}
            refreshing={refreshing}
            onRefresh={refresh}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            onScrollToIndexFailed={retryScroll}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

type WatchedRowProps = {
  item: WatchedMovie;
  highlighted: boolean;
};

/**
 * One compact row (#56): poster, title, year, director, and rank. Tapping it
 * opens the movie's page, which has Re-rank, Review, and Remove. A movie that
 * isn't ranked yet keeps one Rank button, since ranking is its next step.
 */
function WatchedRow({ item, highlighted }: WatchedRowProps) {
  const { movie, rankPosition, review } = item;
  const params = { movieId: String(movie.id) };

  return (
    <MovieCard
      movie={movie}
      rank={rankPosition ?? undefined}
      score={item.score}
      note={review ? 'Reviewed' : undefined}
      highlighted={highlighted}
      compact
      onPress={() => openMovie(movie.id)}
      accessibilityHint="Opens the movie’s page to re-rank, review, or remove it, and see your friends’ takes"
      trailing={
        rankPosition === null ? (
          <Button
            size="small"
            label="Rank"
            accessibilityLabel={`Rank ${movie.title}`}
            onPress={() => router.push({ pathname: '/rank/[movieId]', params })}
          />
        ) : undefined
      }
    />
  );
}

/** Opens a movie's page, which has Rank or Re-rank, Review, and Remove. */
function openMovie(movieId: number) {
  router.push({ pathname: '/movie/[movieId]', params: { movieId: String(movieId) } });
}

/**
 * First-run tips (#80, #20): what ranking is, before the first movie. Ranking
 * needs a movie in the list, so the button starts at Search.
 */
function EmptyList() {
  return (
    <View style={styles.empty}>
      <ThemedText type="subtitle" accessibilityRole="header">
        Rank your first movie
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Encore builds your list by asking which of two movies you liked more.
      </ThemedText>
      <View style={styles.steps}>
        <ThemedText type="small">1. Search for a movie you’ve seen and press Mark watched.</ThemedText>
        <ThemedText type="small">
          2. Press Rank and say whether you loved it, thought it was okay, or didn’t like it. Your first movie goes
          straight to #1.
        </ThemedText>
        <ThemedText type="small">
          3. Each movie after that is compared with ones you felt the same about, two at a time, until it finds its
          place.
        </ThemedText>
      </View>
      <Button
        label="Rank your first movie"
        accessibilityHint="Opens Search so you can pick a movie you’ve watched"
        onPress={() => router.navigate('/search')}
      />
      <Button label="Help and FAQ" variant="plain" onPress={() => router.push('/help')} />
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
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  // Same padding and border as a tile, so short rows keep the same tile width.
  gridSpacer: {
    flex: 1,
    padding: Spacing.half,
    borderWidth: 2,
    borderColor: 'transparent',
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
  steps: {
    gap: Spacing.two,
  },
});
