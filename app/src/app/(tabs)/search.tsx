import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TextInput } from 'react-native';
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
import type { Movie } from '@/services/movie-service';
import { markWatched } from '@/services/watched-service';

function openRank(movie: Movie) {
  router.push({ pathname: '/rank/[movieId]', params: { movieId: String(movie.id) } });
}

export default function SearchScreen() {
  const theme = useTheme();
  const { query, setQuery, results, loading, error, retry } = useMovieSearch();
  const { ranked, watchedIds, reload } = useMyMovies();
  const rankedIds = new Set(ranked.map((m) => m.movie.id));
  const [adding, setAdding] = useState<number | null>(null);

  async function add(movie: Movie) {
    setAdding(movie.id);
    try {
      const added = await markWatched(movie.id);
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

  function renderMovie({ item: movie }: { item: Movie }) {
    if (watchedIds.has(movie.id)) {
      const label = rankedIds.has(movie.id) ? 'Re-rank' : 'Rank';
      return (
        <MovieCard movie={movie} note={rankedIds.has(movie.id) ? 'Ranked' : 'In your list'}>
          <Button
            size="small"
            variant="secondary"
            label={label}
            accessibilityLabel={`${label} ${movie.title}`}
            onPress={() => openRank(movie)}
          />
        </MovieCard>
      );
    }
    return (
      <MovieCard movie={movie}>
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
              <ThemedText themeColor="textSecondary">No movies match “{query.trim()}”.</ThemedText>
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
  list: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
