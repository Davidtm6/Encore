import { type ReactNode, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signIn, signUp } from '@/services/auth-service';
import {
  type CredentialErrors,
  type CredentialField,
  hasErrors,
  PASSWORD_HINT,
  USERNAME_HINT,
  validateCredentials,
} from '@/services/auth-validation';
import { messageOf } from '@/services/errors';

export default function SignInScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signingUp = mode === 'sign-up';

  /** Updates a field and clears its error, so a fixed field stops showing one. */
  function edit(field: CredentialField, setValue: (value: string) => void) {
    return (value: string) => {
      setValue(value);
      setFieldErrors((errors) => {
        const next = { ...errors };
        delete next[field];
        return next;
      });
    };
  }

  // On success the session changes and the root layout moves to My List.
  async function submit() {
    const trimmedEmail = email.trim();
    const invalid = validateCredentials(trimmedEmail, password, signingUp ? username.trim() : undefined);
    setFieldErrors(invalid);
    if (hasErrors(invalid)) {
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

  function switchMode() {
    setMode(signingUp ? 'sign-in' : 'sign-up');
    setFieldErrors({});
    setError(null);
    setNotice(null);
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="smallBold" themeColor="accentText">
              Encore
            </ThemedText>
            <ThemedText type="subtitle" accessibilityRole="header">
              {signingUp ? 'Create your account' : 'Sign in'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Rank the movies you watch by choosing between two at a time.
            </ThemedText>

            {signingUp && (
              <Field
                label="Username"
                hint={USERNAME_HINT}
                error={fieldErrors.username}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                value={username}
                onChangeText={edit('username', setUsername)}
              />
            )}
            <Field
              label="Email"
              error={fieldErrors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={edit('email', setEmail)}
            />
            <Field
              label="Password"
              hint={signingUp ? PASSWORD_HINT : undefined}
              error={fieldErrors.password}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={signingUp ? 'newPassword' : 'password'}
              value={password}
              onChangeText={edit('password', setPassword)}
              onSubmitEditing={submit}
              accessory={
                <Button
                  label={showPassword ? 'Hide' : 'Show'}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  variant="plain"
                  size="small"
                  onPress={() => setShowPassword((shown) => !shown)}
                />
              }
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
              onPress={switchMode}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  /** The field's rule, shown until there is an error to show instead. */
  hint?: string;
  error?: string;
  /** A control inside the field on the right, such as Show password. */
  accessory?: ReactNode;
};

/** A labeled text input with its rule or error underneath. */
function Field({ label, hint, error, accessory, ...input }: FieldProps) {
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
