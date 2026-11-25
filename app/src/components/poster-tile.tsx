import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { Movie } from '@/services/movie-service';

const SIZES = {
  small: { width: 44, height: 66, fontSize: 15 },
  large: { width: 132, height: 198, fontSize: 36 },
} as const;

type PosterTileProps = {
  movie: Movie;
  /** A fixed size, or 'fill' to take the container's width at the poster's 2:3 shape (the My List grid). */
  size?: keyof typeof SIZES | 'fill';
};

/** The movie's poster, or a colored tile with its initials when there is none. */
export function PosterTile({ movie, size = 'small' }: PosterTileProps) {
  const { fontSize } = size === 'fill' ? { fontSize: 28 } : SIZES[size];
  const frame = [styles.frame, size === 'fill' ? styles.fill : { width: SIZES[size].width, height: SIZES[size].height }];

  if (movie.poster_url) {
    return <Image source={movie.poster_url} style={frame} contentFit="cover" accessible={false} />;
  }
  return (
    <View
      style={[frame, { backgroundColor: `hsl(${(movie.id * 47) % 360}, 30%, 42%)` }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <Text style={[styles.initials, { fontSize }]}>{initials(movie.title)}</Text>
    </View>
  );
}

function initials(title: string): string {
  const words = title.replace(/^(the|a|an) /i, '').split(/[\s:-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: 700,
    opacity: 0.9,
  },
});
