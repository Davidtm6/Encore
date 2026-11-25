import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PosterTile } from '@/components/poster-tile';
import { RankBadge } from '@/components/rank-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Movie } from '@/services/movie-service';
import type { RatingText } from '@/services/tmdb-rating';

type MovieCardProps = {
  movie: Movie;
  /** Shown in a circle on the right for ranked movies. */
  rank?: number;
  note?: string;
  /** TMDB's audience score, shown after the year and director (search results only, #85). */
  rating?: RatingText | null;
  /** A line or two that tells similar films apart, such as the start of the plot. */
  description?: string | null;
  /** Briefly marks a row, for example the movie that was just ranked. */
  highlighted?: boolean;
  /** Makes the poster and title a button, for example to open the movie's page. */
  onPress?: () => void;
  /** Read by screen readers when the row is a button, saying what pressing it does. */
  accessibilityHint?: string;
  /** Action buttons. */
  children?: ReactNode;
};

/** One movie as a list row: poster, title, year and director, and an optional rank. */
export function MovieCard({
  movie,
  rank,
  note,
  rating,
  description,
  highlighted = false,
  onPress,
  accessibilityHint,
  children,
}: MovieCardProps) {
  const theme = useTheme();
  // The director helps tell similar films apart (#61); it's left out when unknown.
  const details = [movie.release_year, movie.director, rating?.label, note].filter(Boolean).join(' · ');
  const spokenDetails = [movie.release_year, movie.director && `directed by ${movie.director}`, rating?.spoken, note]
    .filter(Boolean)
    .join(', ');

  const label = [rank && `Number ${rank}`, movie.title, spokenDetails, description].filter(Boolean).join(', ');

  return (
    <View style={[styles.row, highlighted && { backgroundColor: theme.accentSoft }]}>
      <Pressable
        style={({ pressed }) => [styles.summary, onPress && pressed && styles.pressed]}
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={label}
        accessibilityHint={onPress ? accessibilityHint : undefined}
        disabled={!onPress}
        onPress={onPress}>
        <PosterTile movie={movie} />
        <View style={styles.text}>
          <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
            {movie.title}
          </ThemedText>
          {details ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {details}
            </ThemedText>
          ) : null}
          {description ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {description}
            </ThemedText>
          ) : null}
        </View>
        {rank !== undefined && <RankBadge rank={rank} />}
      </Pressable>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    marginHorizontal: -Spacing.two,
    borderRadius: 12,
    gap: Spacing.two,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
