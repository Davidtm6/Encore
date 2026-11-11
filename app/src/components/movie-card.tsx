import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PosterTile } from '@/components/poster-tile';
import { RankBadge } from '@/components/rank-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Movie } from '@/services/movie-service';

type MovieCardProps = {
  movie: Movie;
  /** Shown in a circle on the right for ranked movies. */
  rank?: number;
  note?: string;
  /** A line or two that tells similar films apart, such as the start of the plot. */
  description?: string | null;
  /** Briefly marks a row, for example the movie that was just ranked. */
  highlighted?: boolean;
  /** Action buttons. */
  children?: ReactNode;
};

/** One movie as a list row: poster, title and details, and an optional rank. */
export function MovieCard({ movie, rank, note, description, highlighted = false, children }: MovieCardProps) {
  const theme = useTheme();
  const details = [movie.release_year, note].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, highlighted && { backgroundColor: theme.accentSoft }]}>
      <View
        style={styles.summary}
        accessible
        accessibilityLabel={[rank && `Number ${rank}`, movie.title, details, description].filter(Boolean).join(', ')}>
        <PosterTile movie={movie} />
        <View style={styles.text}>
          <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
            {movie.title}
          </ThemedText>
          {details ? (
            <ThemedText type="small" themeColor="textSecondary">
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
      </View>
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
