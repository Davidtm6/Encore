import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { ListSeparator } from '@/components/list-separator';
import { MovieCard } from '@/components/movie-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useMovieSearch } from '@/hooks/use-movie-search';
import { useMyMovies } from '@/hooks/use-my-movies';
import { useTheme } from '@/hooks/use-theme';
import { TIER_LABELS, TIERS, type Tier } from '@/ranking/score';
import { messageOf } from '@/services/errors';
import type { Movie, SearchResult } from '@/services/movie-service';
import { fileUnderTier } from '@/services/ranking-api';
import { tmdbRatingText } from '@/services/tmdb-rating';
import { markWatched, removeWatched } from '@/services/watched-service';

function openRank(movie: Movie) {
  router.push({ pathname: '/rank/[movieId]', params: { movieId: String(movie.id) } });
}

export default function SearchScreen() {
  const theme = useTheme();
  const { query, setQuery, results, suggestions, fromSaved, searchedQuery, loading, error, retry } = useMovieSearch();
  // A search that found nothing lists its near matches instead.
  const didYouMean = results.length === 0 && suggestions.length > 0;
  const shown = didYouMean ? suggestions : results;
  const { ranked, watchedIds, reload } = useMyMovies();
  const rankedIds = new Set(ranked.map((m) => m.movie.id));
  const [adding, setAdding] = useState<number | null>(null);
  // Movies added from this screen, which can be taken back out with Undo until they're ranked.
  const [justAdded, setJustAdded] = useState<ReadonlySet<number>>(new Set());
  // Where movies filed under a tier from this screen landed, shown on their rows (#79).
  // The tier being saved, so only its button shows a spinner.
  const [filing, setFiling] = useState<Tier | null>(null);
  const [filed, setFiled] = useState<ReadonlyMap<number, string>>(new Map());

  async function add(movie: Movie) {
    setAdding(movie.id);
    try {
      const added = await markWatched(movie.id);
      if (added) {
        setJustAdded((ids) => new Set(ids).add(movie.id));
      }
      await reload();
      // The row now offers the tier buttons, Rank, and Undo in place of an alert (#79).
      AccessibilityInfo.announceForAccessibility(
        added ? `Added ${movie.title}. How was it?` : `${movie.title} is already in your list`,
      );
    } catch (e) {
      Alert.alert('Couldn’t add the movie', messageOf(e));
    } finally {
      setAdding(null);
    }
  }

  /** Files a just-added movie at the bottom of a tier, to compare later with Re-rank (#79). */
  async function file(movie: Movie, tier: Tier) {
    setAdding(movie.id);
    setFiling(tier);
    try {
      const position = await fileUnderTier(movie.id, tier);
      const note = `${TIER_LABELS[tier]} · #${position}`;
      setFiled((notes) => new Map(notes).set(movie.id, note));
      await reload();
      AccessibilityInfo.announceForAccessibility(
        `${movie.title} saved under ${TIER_LABELS[tier]} at number ${position}. Re-rank it any time to compare.`,
      );
    } catch (e) {
      Alert.alert('Couldn’t save the movie’s place', messageOf(e));
    } finally {
      setFiling(null);
      setAdding(null);
    }
  }

  async function undo(movie: Movie) {
    setAdding(movie.id);
    try {
      await removeWatched(movie.id);
      setJustAdded((ids) => {
        const next = new Set(ids);
        next.delete(movie.id);
        return next;
      });
      await reload();
    } catch (e) {
      Alert.alert('Couldn’t remove the movie', messageOf(e));
    } finally {
      setAdding(null);
    }
  }

  function renderMovie({ item: movie }: { item: SearchResult }) {
    if (watchedIds.has(movie.id)) {
      const isRanked = rankedIds.has(movie.id);
      const label = isRanked ? 'Re-rank' : 'Rank';
      const rankButton = (
        <Button
          size="small"
          // Ranking is the next step for an unranked film, so it gets the filled style.
          variant={isRanked ? 'secondary' : 'primary'}
          label={label}
          accessibilityLabel={`${label} ${movie.title}`}
          onPress={() => openRank(movie)}
        />
      );
      const filedNote = filed.get(movie.id);
      return (
        <MovieCard
          movie={movie}
          note={isRanked ? (filedNote ?? 'Ranked') : 'In your list'}
          rating={tmdbRatingText(movie.vote_average, movie.vote_count)}
          description={movie.overview}>
          {!isRanked && justAdded.has(movie.id) ? (
            // Just added: file it under a tier now and compare later, or rank it properly now (#79).
            <View style={styles.quick}>
              <ThemedText type="small" themeColor="textSecondary">
                How was it? Pick one to add it to your ranking now, and compare it later with Re-rank.
              </ThemedText>
              <View style={styles.quickRow}>
                {TIERS.map((tier) => (
                  <Button
                    key={tier}
                    size="small"
                    variant="secondary"
                    label={TIER_LABELS[tier]}
                    accessibilityLabel={`${TIER_LABELS[tier]}: put ${movie.title} at the bottom of that group`}
                    busy={adding === movie.id && filing === tier}
                    disabled={adding !== null}
                    onPress={() => file(movie, tier)}
                  />
                ))}
              </View>
              <View style={styles.quickRow}>
                <Button
                  size="small"
                  variant="plain"
                  label="Undo"
                  accessibilityLabel={`Undo marking ${movie.title} watched`}
                  busy={adding === movie.id && filing === null}
                  disabled={adding !== null}
                  onPress={() => undo(movie)}
                />
                {rankButton}
              </View>
            </View>
          ) : (
            rankButton
          )}
        </MovieCard>
      );
    }
    return (
      <MovieCard
        movie={movie}
        rating={tmdbRatingText(movie.vote_average, movie.vote_count)}
        description={movie.overview}>
        <Button
          size="small"
          label="Mark watched"
          accessibilityLabel={`Mark ${movie.title} watched`}
          busy={adding === movie.id}
          disabled={adding !== null}
          onPress={() => add(movie)}
        />
      </MovieCard>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
          Search
        </ThemedText>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Search by title"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Search movies by title"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
        />
        {error && <ErrorBanner message={error} onRetry={retry} />}
        <FlatList
          data={shown}
          keyExtractor={(movie) => String(movie.id)}
          renderItem={renderMovie}
          ItemSeparatorComponent={ListSeparator}
          // The last results stay up, dimmed, while the next search loads.
          style={loading && shown.length > 0 ? styles.stale : undefined}
          ListHeaderComponent={
            <View style={styles.header}>
              {loading && (
                <View style={styles.searching} accessibilityLiveRegion="polite">
                  <ActivityIndicator />
                  <ThemedText type="small" themeColor="textSecondary">
                    {query.trim() ? `Searching for “${query.trim()}”…` : 'Loading popular movies…'}
                  </ThemedText>
                </View>
              )}
              {didYouMean && (
                <ThemedText themeColor="textSecondary">No movies match “{searchedQuery}”.</ThemedText>
              )}
              {fromSaved && shown.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Live search isn’t available right now, so these are only movies already saved in Encore, without
                  plot summaries.
                </ThemedText>
              )}
              {didYouMean ? (
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                  Did you mean
                </ThemedText>
              ) : !searchedQuery && shown.length > 0 && !fromSaved ? (
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                  Popular right now
                </ThemedText>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading || error ? undefined : (
              <View style={styles.empty}>
                <ThemedText themeColor="textSecondary">No movies match “{searchedQuery}”.</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Check the spelling, or try fewer or different words from the title.
                </ThemedText>
                <Button label="Clear search" variant="secondary" size="small" onPress={() => setQuery('')} />
              </View>
            )
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
        />
      </SafeAreaView>
    </ThemedView>
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
    gap: Spacing.three,
  },
  sectionTitle: {
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    paddingTop: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  header: {
    gap: Spacing.two,
  },
  searching: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  quick: {
    flex: 1,
    gap: Spacing.two,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  stale: {
    opacity: 0.5,
  },
  empty: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  list: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
