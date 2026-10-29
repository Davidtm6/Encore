import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** The hairline between list rows. */
export function ListSeparator() {
  const theme = useTheme();
  return <View style={[styles.line, { backgroundColor: theme.separator }]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
  },
});
