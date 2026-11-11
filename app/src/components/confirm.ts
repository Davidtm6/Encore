import { Alert, Platform } from 'react-native';

/**
 * Asks the person to confirm a destructive action and resolves to their
 * answer. React Native's Alert does nothing on web, so web uses the browser's
 * confirm dialog instead.
 */
export function confirmAction(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const browserConfirm = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(browserConfirm ? browserConfirm(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Keep', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
