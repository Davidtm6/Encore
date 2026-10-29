import { Pressable, StyleSheet, View } from 'react-native';

import { PosterTile } from '@/components/poster-tile';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Movie } from '@/services/movie-service';

type ComparisonPairProps = {
  movie: Movie;
  opponent: Movie;
  /** Called with true when the user prefers `movie`. */
  onChoose: (preferMovie: boolean) => void;
};

/** One head-to-head question: tap the movie you enjoyed more. */
export function ComparisonPair({ movie, opponent, onChoose }: ComparisonPairProps) {
  return (
    <View style={styles.pair}>
      <Choice movie={movie} onPress={() => onChoose(true)} />
      <ThemedText type="smallBold" themeColor="textSecondary" importantForAccessibility="no">
        or
      </ThemedText>
      <Choice movie={opponent} onPress={() => onChoose(false)} />
    </View>
  );
}

function Choice({ movie, onPress }: { movie: Movie; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Prefer ${movie.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: pressed ? theme.accentSoft : theme.background,
          borderColor: pressed ? theme.accent : theme.separator,
        },
      ]}>
      <PosterTile movie={movie} size="large" />
      <ThemedText type="smallBold" numberOfLines={3} style={styles.title}>
        {movie.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {movie.release_year}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  choice: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
  },
  title: {
    textAlign: 'center',
  },
});
