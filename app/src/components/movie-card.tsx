import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PosterTile } from '@/components/poster-tile';
import { RankBadge } from '@/components/rank-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Movie } from '@/services/movie-service';

type MovieCardProps = {
  movie: Movie;
  /** Shown in a circle on the right for ranked movies. */
  rank?: number;
  note?: string;
  /** Action buttons. */
  children?: ReactNode;
};

/** One movie as a list row: poster, title and details, and an optional rank. */
export function MovieCard({ movie, rank, note, children }: MovieCardProps) {
  const details = [movie.release_year, note].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <View
        style={styles.summary}
        accessible
        accessibilityLabel={[rank && `Number ${rank}`, movie.title, details].filter(Boolean).join(', ')}>
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
