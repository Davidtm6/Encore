import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: theme.dangerSoft }]}>
      <ThemedText type="small" themeColor="danger" style={styles.message}>
        {message}
      </ThemedText>
      {onRetry ? <Button label="Retry" size="small" variant="plain" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  message: {
    flex: 1,
  },
});
