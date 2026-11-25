import { router, Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ComparisonPair } from '@/components/comparison-pair';
import { confirmAction } from '@/components/confirm';
import { ErrorBanner } from '@/components/error-banner';
import { PosterTile } from '@/components/poster-tile';
import { ProgressBar } from '@/components/progress-bar';
import { RankBadge } from '@/components/rank-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { setSavedRankingNotice } from '@/hooks/saved-ranking-notice';
import { useRanking } from '@/hooks/use-ranking';
import { formatScore, TIER_LABELS, TIERS, type Tier } from '@/ranking/score';
import type { Movie } from '@/services/movie-service';

export default function RankScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const ranking = useRanking(Number(movieId));
  const { movie, opponent, range, position, score, previousPosition, total, progress, above, below } = ranking;
  // Once a tier is picked there is something to lose, so closing asks first.
  const hasAnswers = ranking.tier !== null;
  // Set once the person has agreed to discard, so the screen can then close.
  const [discarding, setDiscarding] = useState(false);

  // Every way of leaving goes through here: the header arrow, Cancel, a swipe,
  // and Android's back button. Closing without saving leaves the stored
  // ranking exactly as it was.
  const allowClosing = usePreventRemove(hasAnswers && !discarding, async ({ repeat }) => {
    if (await confirmAction('Discard this ranking?', 'Your answers so far won’t be saved.', 'Discard')) {
      setDiscarding(true);
      repeat();
    }
  });

  async function save() {
    if (await ranking.save()) {
      if (movie && position !== null) {
        setSavedRankingNotice({ movieId: movie.id, title: movie.title, position });
      }
      // Saved, so there is nothing left to lose and no reason to ask.
      setDiscarding(true);
      allowClosing();
      router.back();
    }
  }

  function result(title: string) {
    const scored = score === null ? '' : ` · ${formatScore(score)}`;
    if (previousPosition === null) {
      return total === 1 ? `${title} is your first ranked movie${scored}.` : `${title} lands at #${position}${scored}.`;
    }
    return previousPosition === position
      ? `${title} stays at #${position}${scored}.`
      : `${title} moves from #${previousPosition} to #${position}${scored}.`;
  }

  let content;
  if (ranking.loadError) {
    content = <ErrorBanner message={ranking.loadError} onRetry={ranking.reload} />;
  } else if (!ranking.ready || !movie) {
    content = <ActivityIndicator accessibilityLabel="Loading your ranking" />;
  } else if (ranking.tier === null) {
    // Step one (#60): a broad tier first, so the comparisons only use movies in it.
    content = (
      <>
        <ThemedText type="subtitle" style={styles.center} accessibilityRole="header">
          How did you feel about {movie.title}?
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {ranking.previousTier
            ? `Last time: ${TIER_LABELS[ranking.previousTier]}. You’ll only compare it with movies you felt the same about.`
            : 'You’ll only compare it with movies you felt the same about.'}
        </ThemedText>
        <View style={styles.tiers}>
          {TIERS.map((tier: Tier) => (
            <Button
              key={tier}
              label={TIER_LABELS[tier]}
              variant={tier === ranking.previousTier ? 'primary' : 'secondary'}
              accessibilityLabel={`${TIER_LABELS[tier]}${tier === ranking.previousTier ? ', your last answer' : ''}`}
              onPress={() => ranking.chooseTier(tier)}
            />
          ))}
        </View>
        <Button label="Cancel" variant="plain" onPress={() => router.back()} />
      </>
    );
  } else if (opponent) {
    const question = progress.answered + 1;
    const most = progress.answered + progress.left;
    const count = question === most ? `Question ${question} (last one)` : `Question ${question} of up to ${most}`;
    content = (
      <>
        <View style={styles.progress}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {count}
          </ThemedText>
          <ProgressBar fraction={progress.fraction} label={count} />
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.center} accessibilityRole="header">
          Which did you enjoy more?
        </ThemedText>
        <ComparisonPair movie={movie} opponent={opponent} onChoose={ranking.choose} />
        {/* #43: no forced guess when the two are too close to call. */}
        <Button
          label="Too close to call? Skip"
          variant="plain"
          size="small"
          accessibilityLabel={`Skip, ${movie.title} and ${opponent.title} are too close to call`}
          onPress={ranking.skip}
        />
        {range && range.best !== range.worst && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center} accessibilityLiveRegion="polite">
            {range.best === 1 && range.worst === range.total
              ? `${movie.title} could land anywhere on your list of ${range.total}.`
              : `${movie.title} could land anywhere from #${range.best} to #${range.worst} of ${range.total}.`}
          </ThemedText>
        )}
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button
              label="Undo"
              variant="secondary"
              accessibilityLabel={progress.answered > 0 ? 'Undo your last answer' : 'Back to how you felt about it'}
              onPress={ranking.back}
              disabled={!ranking.canGoBack}
            />
          </View>
          <View style={styles.grow}>
            <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      </>
    );
  } else {
    content = (
      <>
        {progress.answered > 0 && <ProgressBar fraction={1} label="All questions answered" />}
        <View
          style={styles.result}
          accessible
          accessibilityLabel={`Number ${position} of ${total}${score === null ? '' : `, score ${formatScore(score)}`}`}>
          <PosterTile movie={movie} size="large" />
          {position !== null && <RankBadge rank={position} size="large" />}
          <ThemedText type="small" themeColor="textSecondary">
            of {total} ranked{score === null ? '' : ` · score ${formatScore(score)}`}
            {ranking.tier ? ` · ${TIER_LABELS[ranking.tier]}` : ''}
          </ThemedText>
        </View>
        <ThemedText style={styles.center}>{result(movie.title)}</ThemedText>
        {(above?.movie || below?.movie) && (
          <View style={styles.neighbors}>
            {above?.movie && <Neighbor label="Above it" rank={above.rank} movie={above.movie} />}
            {below?.movie && <Neighbor label="Below it" rank={below.rank} movie={below.movie} />}
          </View>
        )}
        <ThemedText type="smallBold" style={styles.center}>
          Not saved yet. Press Save to keep this place.
        </ThemedText>
        <Button label="Save" onPress={save} busy={ranking.saving} />
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button
              label="Undo"
              variant="secondary"
              accessibilityLabel={progress.answered > 0 ? 'Undo your last answer' : 'Back to how you felt about it'}
              onPress={ranking.back}
              disabled={ranking.saving}
            />
          </View>
          <View style={styles.grow}>
            <Button label="Start over" variant="secondary" onPress={ranking.restart} disabled={ranking.saving} />
          </View>
        </View>
        <Button label="Cancel" variant="plain" onPress={() => router.back()} disabled={ranking.saving} />
      </>
    );
  }

  return (
    <ThemedView style={styles.fill}>
      {/* No swipe-to-close once there are answers, so a swipe can't silently throw them away. */}
      <Stack.Screen
        options={{
          title: previousPosition === null ? 'Rank' : 'Re-rank',
          gestureEnabled: !hasAnswers,
          // Screen readers announce the header arrow as "Close ranking, back".
          headerBackTitle: 'Close ranking',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {/* iOS 26 draws content under the glass header; "automatic" insets it below (#74). */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
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
  tiers: {
    gap: Spacing.two,
  },
  progress: {
    gap: Spacing.two,
  },
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
