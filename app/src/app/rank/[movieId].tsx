import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ComparisonPair } from '@/components/comparison-pair';
import { ErrorBanner } from '@/components/error-banner';
import { PosterTile } from '@/components/poster-tile';
import { RankBadge } from '@/components/rank-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRanking } from '@/hooks/use-ranking';

export default function RankScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const ranking = useRanking(Number(movieId));
  const { movie, opponent, range, position, previousPosition, total } = ranking;

  // Closing without saving leaves the stored ranking exactly as it was.
  const cancel = () => router.back();

  async function save() {
    if (await ranking.save()) {
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
    content = (
      <>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.center} accessibilityRole="header">
          Which did you enjoy more?
        </ThemedText>
        <ComparisonPair movie={movie} opponent={opponent} onChoose={ranking.choose} />
        {range && range.best !== range.worst && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {movie.title} could land anywhere from #{range.best} to #{range.worst}.
          </ThemedText>
        )}
        <Button label="Cancel" variant="secondary" onPress={cancel} />
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
        <Button label="Save" onPress={save} busy={ranking.saving} />
        {total > 1 && (
          <Button label="Start over" variant="secondary" onPress={ranking.restart} disabled={ranking.saving} />
        )}
        <Button label="Cancel" variant="plain" onPress={cancel} disabled={ranking.saving} />
      </>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: previousPosition === null ? 'Rank' : 'Re-rank' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {ranking.saveError && <ErrorBanner message={ranking.saveError} />}
        {content}
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
  center: {
    textAlign: 'center',
  },
  result: {
    alignItems: 'center',
    gap: Spacing.three,
  },
});
