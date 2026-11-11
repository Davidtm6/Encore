import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TextInput, View } from 'react-native';
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
import { messageOf } from '@/services/errors';
import type { Movie, SearchResult } from '@/services/movie-service';
import { markWatched, removeWatched } from '@/services/watched-service';

function openRank(movie: Movie) {
  router.push({ pathname: '/rank/[movieId]', params: { movieId: String(movie.id) } });
}

export default function SearchScreen() {
  const theme = useTheme();
  const { query, setQuery, results, loading, error, retry } = useMovieSearch();
  const { ranked, watchedIds, reload } = useMyMovies();
  const rankedIds = new Set(ranked.map((m) => m.movie.id));
  const [adding, setAdding] = useState<number | null>(null);
  // Movies added from this screen, which can be taken back out with Undo until they're ranked.
  const [justAdded, setJustAdded] = useState<ReadonlySet<number>>(new Set());

  async function add(movie: Movie) {
    setAdding(movie.id);
    try {
      const added = await markWatched(movie.id);
      if (added) {
        setJustAdded((ids) => new Set(ids).add(movie.id));
      }
      await reload();
      Alert.alert(added ? `Added ${movie.title}` : `${movie.title} is already in your list`, 'Rank it now?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Rank now', onPress: () => openRank(movie) },
      ]);
    } catch (e) {
      Alert.alert('Couldn’t add the movie', messageOf(e));
    } finally {
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
      return (
        <MovieCard movie={movie} note={isRanked ? 'Ranked' : 'In your list'} description={movie.overview}>
          {!isRanked && justAdded.has(movie.id) && (
            <Button
              size="small"
              variant="plain"
              label="Undo"
              accessibilityLabel={`Undo marking ${movie.title} watched`}
              busy={adding === movie.id}
              disabled={adding !== null}
              onPress={() => undo(movie)}
            />
          )}
          <Button
            size="small"
            // Ranking is the next step for an unranked film, so it gets the filled style.
            variant={isRanked ? 'secondary' : 'primary'}
            label={label}
            accessibilityLabel={`${label} ${movie.title}`}
            onPress={() => openRank(movie)}
          />
        </MovieCard>
      );
    }
    return (
      <MovieCard movie={movie} description={movie.overview}>
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
          data={results}
          keyExtractor={(movie) => String(movie.id)}
          renderItem={renderMovie}
          ItemSeparatorComponent={ListSeparator}
          ListHeaderComponent={
            loading ? (
              <ActivityIndicator style={styles.loading} />
            ) : !query.trim() && results.length > 0 ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                Popular right now
              </ThemedText>
            ) : undefined
          }
          ListEmptyComponent={
            loading || error ? undefined : (
              <View style={styles.empty}>
                <ThemedText themeColor="textSecondary">No movies match “{query.trim()}”.</ThemedText>
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
  loading: {
    marginBottom: Spacing.three,
  },
  empty: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  list: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
