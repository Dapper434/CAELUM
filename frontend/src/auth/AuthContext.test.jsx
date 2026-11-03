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
      <button onClick={() => auth.signInDemo('admin')}>demo</button>
      <button onClick={() => auth.signInWithPassword('a@b.c', 'pw')}>password</button>
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

describe('AuthProvider', () => {
  it('signs in with the demo admin and checks /me', async () => {
    const fetchMock = routeFetch({
      'POST /api/v1/auth/demo-login': respond(200, { data: { access_token: 'demo-jwt', user: { role: 'admin' } } }),
      'GET /api/v1/me': (url, init) => {
        expect(init.headers.Authorization).toBe('Bearer demo-jwt');
        return respond(200, { data: { role: 'admin', email: 'admin@caelum.demo' } });
      },
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider supabase={null}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    await act(async () => screen.getByText('demo').click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(sessionStorage.getItem('caelum_demo_token')).toBe('demo-jwt');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ login: 'admin' });
  });

  it('rejects a token without the admin role', async () => {
    vi.stubGlobal('fetch', routeFetch({
      'POST /api/v1/auth/demo-login': respond(200, { data: { access_token: 'x' } }),
      'GET /api/v1/me': respond(200, { data: { role: 'facility' } }),
    }));
    render(<AuthProvider supabase={null}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    await act(async () => screen.getByText('demo').click());
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(/admin role/));
    expect(sessionStorage.getItem('caelum_demo_token')).toBeNull();
  });

  it('signs out when the API answers 401', async () => {
    sessionStorage.setItem('caelum_demo_token', 'old');
    let meCalls = 0;
    vi.stubGlobal('fetch', routeFetch({
      'GET /api/v1/me': () => {
        meCalls += 1;
        return meCalls === 1
          ? respond(200, { data: { role: 'admin' } })
          : respond(401, { error: { code: 'unauthorized', message: 'expired' } });
      },
    }));
    render(<AuthProvider supabase={null}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    await act(async () => { await api.get('/me').catch(() => {}); });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    expect(screen.getByTestId('error')).toHaveTextContent(/expired/);
    expect(sessionStorage.getItem('caelum_demo_token')).toBeNull();
  });

  it('uses the Supabase session token for password sign-in', async () => {
    const supabase = {
      auth: {
        getSession: vi.fn()
          .mockResolvedValueOnce({ data: { session: null } })
          .mockResolvedValue({ data: { session: { access_token: 'sb-jwt' } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    };
    vi.stubGlobal('fetch', routeFetch({
      'GET /api/v1/me': (url, init) => {
        expect(init.headers.Authorization).toBe('Bearer sb-jwt');
        return respond(200, { data: { role: 'admin' } });
      },
    }));
    render(<AuthProvider supabase={supabase}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    await act(async () => screen.getByText('password').click());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pw' });
  });
});
