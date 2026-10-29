import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary: filled teal pill; secondary: outlined pill; plain: teal text. */
  variant?: 'primary' | 'secondary' | 'plain';
  size?: 'regular' | 'small';
  disabled?: boolean;
  busy?: boolean;
  /** Read by screen readers when the visible label needs more context. */
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled = false,
  busy = false,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const color = { primary: theme.onAccent, secondary: theme.text, plain: theme.accentText }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'small' && styles.small,
        variant === 'primary' && { backgroundColor: theme.accent },
        variant === 'secondary' && { borderWidth: 1, borderColor: theme.border },
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.label, size === 'small' && styles.smallLabel, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 16,
    fontWeight: 600,
  },
  smallLabel: {
    fontSize: 14,
  },
});
