import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../auth/AuthContext';
import SignInPage from './SignInPage';

const respond = (status, body) => ({ ok: status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(body) });

function fakeSupabase() {
  let session = null;
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      signInWithPassword: vi.fn(async () => { session = { access_token: 'sb-jwt' }; return { error: null }; }),
      signOut: vi.fn(async () => ({})),
    },
  };
}

describe('SignInPage', () => {
  it('hides the demo button unless demo mode is on', () => {
    render(<AuthProvider supabase={fakeSupabase()}><SignInPage config={{ apiBaseUrl: 'x', demoMode: false }} passwordEnabled /></AuthProvider>);
    expect(screen.queryByText(/demo admin/i)).not.toBeInTheDocument();
  });

  it('demo button only prefills the email, then signs in through Supabase', async () => {
    const supabase = fakeSupabase();
    const fetchMock = vi.fn(async () => respond(200, { data: { role: 'admin', email: 'admin@caelum.demo' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider supabase={supabase}><SignInPage config={{ apiBaseUrl: 'x', demoMode: true }} passwordEnabled /></AuthProvider>);
    await userEvent.click(screen.getByRole('button', { name: /use demo admin/i }));
    expect(screen.getByLabelText('Email')).toHaveValue('admin@caelum.demo');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Password'), 'typed-by-user');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'admin@caelum.demo', password: 'typed-by-user' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/me$/);
  });

  it('warns when the API URL is missing', () => {
    render(<AuthProvider supabase={null}><SignInPage config={{ apiBaseUrl: '', demoMode: false }} passwordEnabled /></AuthProvider>);
    expect(screen.getByText(/VITE_API_BASE_URL is not set/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('explains which keys are needed when Supabase is not configured', () => {
    render(<AuthProvider supabase={null}><SignInPage config={{ apiBaseUrl: 'x', demoMode: true }} passwordEnabled={false} /></AuthProvider>);
    expect(screen.getByText(/VITE_SUPABASE_PUBLISHABLE_KEY/)).toBeInTheDocument();
  });
});
