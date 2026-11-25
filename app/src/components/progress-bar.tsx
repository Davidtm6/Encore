import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  /** How full the bar is, from 0 to 1. */
  fraction: number;
  /** What screen readers announce, such as "Question 2 of up to 4". */
  label: string;
};

/** A thin bar that fills from left to right, announced to screen readers as a progress bar. */
export function ProgressBar({ fraction, label }: ProgressBarProps) {
  const theme = useTheme();
  const percent = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
