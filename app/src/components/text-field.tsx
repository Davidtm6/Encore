import type { ReactNode } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
  /** The field's rule, shown until there is an error to show instead. */
  hint?: string;
  error?: string;
  /** A control inside the field on the right, such as Show password. */
  accessory?: ReactNode;
};

/** A labeled text input with its rule or error underneath. */
export function TextField({ label, hint, error, accessory, ...input }: TextFieldProps) {
  const theme = useTheme();
  const helper = error ?? hint;
  return (
    <View style={styles.field}>
      <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement }, error && { borderColor: theme.danger }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={label}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={label}
          accessibilityHint={helper}
          {...input}
        />
        {accessory}
      </View>
      {helper ? (
        <ThemedText
          type="small"
          themeColor={error ? 'danger' : 'textSecondary'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {helper}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingRight: Spacing.one,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
