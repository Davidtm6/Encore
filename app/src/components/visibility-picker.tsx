import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ReviewVisibility, VISIBILITY_OPTIONS, visibilityHint } from '@/services/review-visibility';

type VisibilityPickerProps = {
  value: ReviewVisibility;
  onChange: (value: ReviewVisibility) => void;
  disabled?: boolean;
};

/** "Who can read this": a two-way choice between friends only and everyone (#15). */
export function VisibilityPicker({ value, onChange, disabled = false }: VisibilityPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" nativeID="visibility-label">
        Who can read this
      </ThemedText>
      <View
        style={[styles.track, { backgroundColor: theme.backgroundElement }]}
        accessibilityRole="radiogroup"
        accessibilityLabelledBy="visibility-label">
        {VISIBILITY_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityHint={option.hint}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && { backgroundColor: theme.accent }]}>
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.onAccent : theme.text }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {visibilityHint(value)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: Spacing.one,
  },
  option: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
