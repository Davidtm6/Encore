import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const SIZES = {
  small: { diameter: 38, fontSize: 15 },
  large: { diameter: 88, fontSize: 32 },
} as const;

type RankBadgeProps = {
  rank: number;
  size?: keyof typeof SIZES;
};

/** A movie's place in the user's list, drawn as a green outlined circle. */
export function RankBadge({ rank, size = 'small' }: RankBadgeProps) {
  const theme = useTheme();
  const { diameter, fontSize } = SIZES[size];

  return (
    <View
      style={[
        styles.circle,
        { width: diameter, height: diameter, borderColor: theme.score, borderWidth: size === 'large' ? 3 : 1.5 },
      ]}>
      <Text style={[styles.number, { color: theme.scoreText, fontSize }]} numberOfLines={1} adjustsFontSizeToFit>
        {rank}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  number: {
    fontWeight: 700,
  },
});
