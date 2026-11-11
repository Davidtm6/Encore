import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ComparisonPair } from '@/components/comparison-pair';
import { confirmAction } from '@/components/confirm';
import { ErrorBanner } from '@/components/error-banner';
import { PosterTile } from '@/components/poster-tile';
import { RankBadge } from '@/components/rank-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { setSavedRankingNotice } from '@/hooks/saved-ranking-notice';
import { useRanking } from '@/hooks/use-ranking';
import type { Movie } from '@/services/movie-service';

export default function RankScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const ranking = useRanking(Number(movieId));
  const { movie, opponent, range, position, previousPosition, total, progress, above, below } = ranking;
  // Once an answer is given there is something to lose, so closing asks first.
  const hasAnswers = progress.answered > 0;

  // Closing without saving leaves the stored ranking exactly as it was.
  async function cancel() {
    if (
      !hasAnswers ||
      (await confirmAction('Discard this ranking?', 'Your answers so far won’t be saved.', 'Discard'))
    ) {
      router.back();
    }
  }

  async function save() {
    if (await ranking.save()) {
      if (movie && position !== null) {
        setSavedRankingNotice({ movieId: movie.id, title: movie.title, position });
      }
      router.back();
    }
  }

  function result(title: string) {
    if (previousPosition === null) {
      return total === 1 ? `${title} is your first ranked movie.` : `${title} lands at #${position}.`;
    }
    return previousPosition === position
      ? `${title} stays at #${position}.`
      : `${title} moves from #${previousPosition} to #${position}.`;
  }

  let content;
  if (ranking.loadError) {
    content = <ErrorBanner message={ranking.loadError} onRetry={ranking.reload} />;
  } else if (!ranking.ready || !movie) {
    content = <ActivityIndicator accessibilityLabel="Loading your ranking" />;
  } else if (opponent) {
    const question = progress.answered + 1;
    const most = progress.answered + progress.left;
    content = (
      <>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {question === most ? `Question ${question} (last one)` : `Question ${question} of up to ${most}`}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.center} accessibilityRole="header">
          Which did you enjoy more?
        </ThemedText>
        <ComparisonPair movie={movie} opponent={opponent} onChoose={ranking.choose} />
        {range && range.best !== range.worst && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {movie.title} could land anywhere from #{range.best} to #{range.worst}.
          </ThemedText>
        )}
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button
              label="Back"
              variant="secondary"
              accessibilityLabel="Back: undo your last answer"
              onPress={ranking.back}
              disabled={!ranking.canGoBack}
            />
          </View>
          <View style={styles.grow}>
            <Button label="Cancel" variant="secondary" onPress={cancel} />
          </View>
        </View>
      </>
    );
  } else {
    content = (
      <>
        <View style={styles.result} accessible accessibilityLabel={`Number ${position} of ${total}`}>
          <PosterTile movie={movie} size="large" />
          {position !== null && <RankBadge rank={position} size="large" />}
          <ThemedText type="small" themeColor="textSecondary">
            of {total} ranked
          </ThemedText>
        </View>
        <ThemedText style={styles.center}>{result(movie.title)}</ThemedText>
        {(above?.movie || below?.movie) && (
          <View style={styles.neighbors}>
            {above?.movie && <Neighbor label="Above it" rank={above.rank} movie={above.movie} />}
            {below?.movie && <Neighbor label="Below it" rank={below.rank} movie={below.movie} />}
          </View>
        )}
        <Button label="Save" onPress={save} busy={ranking.saving} />
        {ranking.canGoBack && (
          <Button
            label="Back"
            variant="secondary"
            accessibilityLabel="Back: undo your last answer"
            onPress={ranking.back}
            disabled={ranking.saving}
          />
        )}
        {total > 1 && (
          <Button label="Start over" variant="secondary" onPress={ranking.restart} disabled={ranking.saving} />
        )}
        <Button label="Cancel" variant="plain" onPress={cancel} disabled={ranking.saving} />
      </>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      {/* No swipe-to-close once there are answers, so a swipe can't silently throw them away. */}
      <Stack.Screen options={{ title: previousPosition === null ? 'Rank' : 'Re-rank', gestureEnabled: !hasAnswers }} />
      <ScrollView contentContainerStyle={styles.content}>
        {ranking.saveError && <ErrorBanner message={ranking.saveError} />}
        {content}
      </ScrollView>
    </ThemedView>
  );
}

/** One of the films next to the new place, so the result can be checked before saving. */
function Neighbor({ label, rank, movie }: { label: string; rank: number; movie: Movie }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
      {label}: #{rank} {movie.title}
      {movie.release_year ? ` (${movie.release_year})` : ''}
    </ThemedText>
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
  center: {
    textAlign: 'center',
  },
  result: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  neighbors: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
});
