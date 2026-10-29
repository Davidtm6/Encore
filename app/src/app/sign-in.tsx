import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signIn, signUp, validateCredentials } from '@/services/auth-service';
import { messageOf } from '@/services/errors';

export default function SignInScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signingUp = mode === 'sign-up';
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  // On success the session changes and the root layout moves to My List.
  async function submit() {
    const trimmedEmail = email.trim();
    const invalid = validateCredentials(trimmedEmail, password, signingUp ? username.trim() : undefined);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!signingUp) {
        await signIn(trimmedEmail, password);
      } else if (!(await signUp(trimmedEmail, password, username.trim()))) {
        setMode('sign-in');
        setNotice('Account created. Confirm your email with the link we sent, then sign in.');
        setBusy(false);
      }
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle" themeColor="accentText" accessibilityRole="header">
              Encore
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Rank the movies you watch by choosing between two at a time.
            </ThemedText>

            {signingUp && (
              <TextInput
                style={inputStyle}
                placeholder="Username"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Username"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                value={username}
                onChangeText={setUsername}
              />
            )}
            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={inputStyle}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Password"
              secureTextEntry
              textContentType={signingUp ? 'newPassword' : 'password'}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />

            {notice && (
              <ThemedText type="small" accessibilityRole="alert">
                {notice}
              </ThemedText>
            )}
            {error && <ErrorBanner message={error} />}

            <Button label={signingUp ? 'Create account' : 'Sign in'} onPress={submit} busy={busy} />
            <Button
              variant="plain"
              label={signingUp ? 'Have an account? Sign in' : 'New here? Create an account'}
              onPress={() => {
                setMode(signingUp ? 'sign-in' : 'sign-up');
                setError(null);
                setNotice(null);
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
