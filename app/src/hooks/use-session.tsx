import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { recoveringAfter } from '@/services/password-reset';
import { supabase } from '@/services/supabase';

interface SessionState {
  session: Session | null;
  /** True until the stored session has been read on launch. */
  loading: boolean;
  /**
   * True while the session comes from a password-reset code and the new
   * password isn't saved yet, so the person stays on the reset screen.
   */
  recovering: boolean;
}

const SessionContext = createContext<SessionState>({ session: null, loading: true, recovering: false });

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true, recovering: false });

  useEffect(() => {
    // Fires once with the stored session (INITIAL_SESSION), then on every sign-in, sign-out, and refresh.
    // The session and the reset flag change in one update, so the screens never see a reset session as a normal one.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((previous) => ({ session, loading: false, recovering: recoveringAfter(event, previous.recovering) }));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  return use(SessionContext);
}
