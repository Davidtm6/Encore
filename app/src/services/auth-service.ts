import type { AuthError } from '@supabase/supabase-js';

import { userError } from '@/services/errors';
import { supabase } from '@/services/supabase';

/** Creates the account. Returns false when the project requires email confirmation before sign-in. */
export async function signUp(email: string, password: string, username: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
  if (error) {
    throw authError(error);
  }
  return data.session !== null;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw authError(error);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw authError(error);
  }
}

function authError(error: AuthError): Error {
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return new Error('An account with that email already exists. Sign in instead.');
    case 'invalid_credentials':
      return new Error('That email and password don’t match an account.');
    case 'email_address_invalid':
      return new Error('Enter a valid email address.');
    case 'email_not_confirmed':
      return new Error('Confirm your email with the link we sent, then sign in.');
    case 'weak_password':
      return new Error(error.message);
  }
  // The sign-up trigger fails when the profile can't be created, almost always
  // because another account already has the username.
  if (/database error saving new user/i.test(error.message)) {
    return new Error('That username is taken. Try another.');
  }
  return userError(error, error.message || 'Something went wrong. Try again.');
}
