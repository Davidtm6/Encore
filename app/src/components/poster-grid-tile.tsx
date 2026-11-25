import { Pressable, StyleSheet, View } from 'react-native';

import { PosterTile } from '@/components/poster-tile';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatScore } from '@/ranking/score';
import type { Movie } from '@/services/movie-service';

type PosterGridTileProps = {
  movie: Movie;
  rank: number | null;
  score: number | null;
  reviewed: boolean;
  /** Briefly marks the tile, for example the movie that was just ranked. */
  highlighted?: boolean;
  onPress: () => void;
};

/**
 * One film in the My List grid (#82): its poster, with the rank and score in
 * a strip underneath, or "Not ranked" until it has a place.
 */
export function PosterGridTile({ movie, rank, score, reviewed, highlighted = false, onPress }: PosterGridTileProps) {
  const theme = useTheme();
  const scoreText = score === null ? null : formatScore(score);
  const label = [
    movie.title,
    movie.release_year,
    rank === null ? 'not ranked yet' : `number ${rank}`,
    scoreText && `score ${scoreText}`,
    reviewed && 'reviewed',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the movie’s page"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        highlighted && { borderColor: theme.accent, backgroundColor: theme.accentSoft },
        pressed && styles.pressed,
      ]}>
      <PosterTile movie={movie} size="fill" />
      <View style={styles.caption}>
        {rank === null ? (
          <ThemedText type="small" themeColor="textSecondary">
            Not ranked
          </ThemedText>
        ) : (
          <>
            <ThemedText type="smallBold">#{rank}</ThemedText>
            {scoreText && (
              <ThemedText type="smallBold" themeColor="scoreText">
                {scoreText}
              </ThemedText>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: Spacing.one,
    padding: Spacing.half,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
  caption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.half,
  },
});
