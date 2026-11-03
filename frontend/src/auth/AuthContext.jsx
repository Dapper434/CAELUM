import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api/client';
import { getMe } from '../lib/api/system';
import { demoLogin } from '../lib/api/auth';
import { supabase as defaultSupabase } from '../lib/supabase';

const DEMO_TOKEN_KEY = 'caelum_demo_token';
const AuthContext = createContext(null);

/**
 * Holds the admin session. A token comes from Supabase Auth or, in demo mode,
 * from POST /auth/demo-login. Every session is checked with GET /me and must
 * carry the admin role. Any 401 from the API signs the user out.
 */
export function AuthProvider({ children, supabase = defaultSupabase }) {
  const [state, setState] = useState({ status: 'loading', me: null, mode: null, error: null });
  const modeRef = useRef(null);

  const tokenProvider = useCallback(async () => {
    if (modeRef.current === 'demo') return sessionStorage.getItem(DEMO_TOKEN_KEY);
    if (modeRef.current === 'supabase' && supabase) {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    }
    return null;
  }, [supabase]);

  const clearSession = useCallback(async (error = null) => {
    const mode = modeRef.current;
    modeRef.current = null;
    sessionStorage.removeItem(DEMO_TOKEN_KEY);
    if (mode === 'supabase' && supabase) {
      try { await supabase.auth.signOut(); } catch { /* already signed out */ }
    }
    setState({ status: 'signedOut', me: null, mode: null, error });
  }, [supabase]);

  const loadMe = useCallback(async (mode) => {
    modeRef.current = mode;
    try {
      const me = await getMe();
      if (me?.role !== 'admin') {
        await clearSession('This account does not have the admin role. Ask a CAELUM administrator for access.');
        return false;
      }
      setState({ status: 'signedIn', me, mode, error: null });
      return true;
    } catch (err) {
      if (modeRef.current) await clearSession(err.status === 401 ? 'Your session has expired. Please sign in again.' : err.message);
      return false;
    }
  }, [clearSession]);

  useEffect(() => {
    api.setTokenProvider(tokenProvider);
    api.setUnauthorizedHandler(() => {
      if (modeRef.current) clearSession('Your session has expired. Please sign in again.');
    });
  }, [tokenProvider, clearSession]);

  // Restore a saved session on first load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionStorage.getItem(DEMO_TOKEN_KEY)) {
        await loadMe('demo');
        return;
      }
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data?.session) {
          await loadMe('supabase');
          return;
        }
      }
      if (!cancelled) setState((s) => (s.status === 'loading' ? { ...s, status: 'signedOut' } : s));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabase) {
      setState((s) => ({ ...s, error: 'Supabase Auth is not configured for this build.' }));
      return false;
    }
    setState((s) => ({ ...s, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((s) => ({ ...s, status: 'signedOut', error: error.message }));
      return false;
    }
    return loadMe('supabase');
  }, [supabase, loadMe]);

  const signInDemo = useCallback(async (login = 'admin') => {
    setState((s) => ({ ...s, error: null }));
    try {
      const result = await demoLogin(login);
      sessionStorage.setItem(DEMO_TOKEN_KEY, result.access_token);
      return loadMe('demo');
    } catch (err) {
      setState((s) => ({ ...s, status: 'signedOut', error: err.message }));
      return false;
    }
  }, [loadMe]);

  const value = useMemo(() => ({
    ...state,
    signInWithPassword,
    signInDemo,
    signOut: () => clearSession(null),
  }), [state, signInWithPassword, signInDemo, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
