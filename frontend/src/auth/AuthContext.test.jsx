import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../lib/api/client';

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="error">{auth.error || ''}</span>
      <span data-testid="email">{auth.me?.email || ''}</span>
      <button onClick={() => auth.signInWithPassword('admin@caelum.demo', 'pw')}>password</button>
      <button onClick={() => auth.signOut()}>out</button>
    </div>
  );
}

function respond(status, body) {
  return { ok: status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(body) };
}

function routeFetch(routes) {
  return vi.fn(async (url, init) => {
    const key = `${init.method} ${new URL(url).pathname}`;
    const handler = routes[key];
    if (!handler) throw new Error(`unexpected ${key}`);
    return typeof handler === 'function' ? handler(url, init) : handler;
  });
}

function fakeSupabase({ session = null, signInError = null } = {}) {
  let current = session;
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: current } })),
      signInWithPassword: vi.fn(async () => {
        if (signInError) return { error: { message: signInError } };
        current = { access_token: 'sb-jwt' };
        return { data: { session: current }, error: null };
      }),
      signOut: vi.fn(async () => { current = null; return {}; }),
    },
  };
}

describe('AuthProvider', () => {
  it('signs in with Supabase and sends the access token to /me as Bearer', async () => {
    const supabase = fakeSupabase();
    const fetchMock = routeFetch({
      'GET /api/v1/me': (url, init) => {
        expect(init.headers.Authorization).toBe('Bearer sb-jwt');
        return respond(200, { data: { role: 'admin', email: 'admin@caelum.demo' } });
      },
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider supabase={supabase}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    await act(async () => screen.getByText('password').click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(screen.getByTestId('email')).toHaveTextContent('admin@caelum.demo');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'admin@caelum.demo', password: 'pw' });
    expect(fetchMock.mock.calls.every(([u]) => !String(u).includes('demo-login'))).toBe(true);
  });

  it('shows the Supabase error for bad credentials and never calls the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider supabase={fakeSupabase({ signInError: 'Invalid login credentials' })}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    await act(async () => screen.getByText('password').click());
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Invalid login credentials'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an account without the admin role and signs it out of Supabase', async () => {
    const supabase = fakeSupabase();
    vi.stubGlobal('fetch', routeFetch({ 'GET /api/v1/me': respond(200, { data: { role: 'courier' } }) }));
    render(<AuthProvider supabase={supabase}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    await act(async () => screen.getByText('password').click());
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(/admin role/));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('restores a saved session, then signs out when the API answers 401', async () => {
    const supabase = fakeSupabase({ session: { access_token: 'saved' } });
    let meCalls = 0;
    vi.stubGlobal('fetch', routeFetch({
      'GET /api/v1/me': () => {
        meCalls += 1;
        return meCalls === 1
          ? respond(200, { data: { role: 'admin' } })
          : respond(401, { error: { code: 'unauthorized', message: 'expired' } });
      },
    }));
    render(<AuthProvider supabase={supabase}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    await act(async () => { await api.get('/me').catch(() => {}); });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    expect(screen.getByTestId('error')).toHaveTextContent(/expired/);
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('clears a leftover demo token and reports missing Supabase config', async () => {
    sessionStorage.setItem('caelum_demo_token', 'old');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider supabase={null}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    expect(sessionStorage.getItem('caelum_demo_token')).toBeNull();
    await act(async () => screen.getByText('password').click());
    expect(screen.getByTestId('error')).toHaveTextContent(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
