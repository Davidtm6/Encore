import { useEffect, useRef, useState } from 'react';

import { sendPasswordResetCode, setNewPassword, signOut, verifyPasswordResetCode } from '@/services/auth-service';
import { validateEmail, validatePassword } from '@/services/auth-validation';
import { messageOf } from '@/services/errors';
import { normalizeResetCode, validateResetCode } from '@/services/password-reset';

type ResetField = 'email' | 'code' | 'password';
type ResetErrors = Partial<Record<ResetField, string>>;

/**
 * Resets a forgotten password in two steps: email a code, then enter the code
 * and a new password. A correct code signs the person in for the reset; saving
 * the password finishes it, and the root layout moves to My List.
 */
export function usePasswordReset() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'send' | 'resend' | 'finish' | null>(null);
  // The code has been accepted, so only the new password is left. The refs
  // mirror the state for the cleanup below, which runs after the last render.
  const [verified, setVerified] = useState(false);
  const verifiedRef = useRef(false);
  const finishingRef = useRef(false);

  // Leaving after the code was accepted but before the password was saved
  // would leave the person signed in without a password they know, so sign out.
  useEffect(() => {
    const verifiedNow = verifiedRef;
    const finishingNow = finishingRef;
    return () => {
      if (verifiedNow.current && !finishingNow.current) {
        signOut().catch(() => {});
      }
    };
  }, []);

  /** Updates a field and clears its error, so a fixed field stops showing one. */
  function edit(field: ResetField, setValue: (value: string) => void) {
    return (value: string) => {
      setValue(value);
      setFieldErrors((errors) => {
        const next = { ...errors };
        delete next[field];
        return next;
      });
    };
  }

  /** Emails a code. `again` is a resend from the code step, which keeps the person there. */
  async function sendCode(again = false) {
    const trimmed = email.trim();
    const invalid = validateEmail(trimmed);
    if (invalid) {
      setFieldErrors({ email: invalid });
      setStep('email');
      return;
    }
    setBusy(again ? 'resend' : 'send');
    setError(null);
    setNotice(null);
    try {
      await sendPasswordResetCode(trimmed);
      setStep('code');
      setCode('');
      setFieldErrors({});
      setNotice(
        `If an account uses ${trimmed}, we’ve emailed it a code. It can take a minute to arrive, so check your spam folder too.`,
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  }

  /** Checks the code (once), then saves the new password. */
  async function finish() {
    const invalid: ResetErrors = {};
    const codeError = verifiedRef.current ? undefined : validateResetCode(code);
    const passwordError = validatePassword(password);
    if (codeError) {
      invalid.code = codeError;
    }
    if (passwordError) {
      invalid.password = passwordError;
    }
    setFieldErrors(invalid);
    if (codeError || passwordError) {
      return;
    }
    setBusy('finish');
    setError(null);
    try {
      if (!verifiedRef.current) {
        await verifyPasswordResetCode(email.trim(), normalizeResetCode(code));
        verifiedRef.current = true;
        setVerified(true);
        setNotice(null);
      }
      // Saving the password moves the person to My List, which unmounts this
      // screen before the call returns; this keeps the cleanup from signing out.
      finishingRef.current = true;
      await setNewPassword(password);
    } catch (e) {
      finishingRef.current = false;
      setError(messageOf(e));
      setBusy(null);
    }
  }

  /** Goes back to the email step to fix a mistyped address. Not offered once the code is accepted. */
  function changeEmail() {
    setStep('email');
    setCode('');
    setFieldErrors({});
    setError(null);
    setNotice(null);
  }

  return {
    step,
    email,
    setEmail: edit('email', setEmail),
    code,
    setCode: edit('code', setCode),
    password,
    setPassword: edit('password', setPassword),
    fieldErrors,
    error,
    notice,
    busy,
    verified,
    sendCode,
    finish,
    changeEmail,
  };
}
