import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePasswordReset } from '@/hooks/use-password-reset';
import { PASSWORD_HINT } from '@/services/auth-validation';

/** Resets a forgotten password with a code sent by email (UC1). Reached from "Forgot password?" on sign-in. */
export default function ForgotPasswordScreen() {
  const reset = usePasswordReset();
  const [showPassword, setShowPassword] = useState(false);
  const onCodeStep = reset.step === 'code';

  let intro = 'Enter the email you signed up with, and we’ll send you a code for choosing a new password.';
  if (reset.verified) {
    intro = 'Your code worked. Choose a new password to finish.';
  } else if (onCodeStep) {
    intro = 'Enter the code from the email and choose a new password.';
  }

  return (
    <ThemedView style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* iOS 26 draws content under the glass header; "automatic" insets it below (#74). */}
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" accessibilityRole="header">
            {onCodeStep ? 'Choose a new password' : 'Reset your password'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{intro}</ThemedText>

          {onCodeStep ? (
            <>
              {!reset.verified && (
                <TextField
                  label="Code"
                  hint={`Sent to ${reset.email.trim()}.`}
                  error={reset.fieldErrors.code}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  value={reset.code}
                  onChangeText={reset.setCode}
                />
              )}
              <TextField
                label="New password"
                hint={PASSWORD_HINT}
                error={reset.fieldErrors.password}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                value={reset.password}
                onChangeText={reset.setPassword}
                onSubmitEditing={reset.finish}
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
            </>
          ) : (
            <TextField
              label="Email"
              error={reset.fieldErrors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              value={reset.email}
              onChangeText={reset.setEmail}
              onSubmitEditing={() => reset.sendCode()}
            />
          )}

          {reset.notice && (
            <ThemedText type="small" accessibilityRole="alert">
              {reset.notice}
            </ThemedText>
          )}
          {reset.error && <ErrorBanner message={reset.error} />}

          {onCodeStep ? (
            <>
              <Button
                label="Save new password"
                onPress={reset.finish}
                busy={reset.busy === 'finish'}
                disabled={reset.busy !== null && reset.busy !== 'finish'}
              />
              {!reset.verified && (
                <>
                  <Button
                    variant="plain"
                    label="Send a new code"
                    onPress={() => reset.sendCode(true)}
                    busy={reset.busy === 'resend'}
                    disabled={reset.busy !== null && reset.busy !== 'resend'}
                  />
                  <Button variant="plain" label="Use a different email" onPress={reset.changeEmail} disabled={reset.busy !== null} />
                </>
              )}
            </>
          ) : (
            <Button label="Send code" onPress={() => reset.sendCode()} busy={reset.busy === 'send'} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
