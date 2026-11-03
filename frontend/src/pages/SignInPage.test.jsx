import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../auth/AuthContext';
import SignInPage from './SignInPage';

const respond = (status, body) => ({ ok: status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(body) });

describe('SignInPage', () => {
  it('hides demo buttons unless demo mode is on', async () => {
    render(<AuthProvider supabase={null}><SignInPage config={{ apiBaseUrl: 'x', demoMode: false }} passwordEnabled={false} /></AuthProvider>);
    expect(screen.queryByText(/demo admin/i)).not.toBeInTheDocument();
  });

  it('shows a demo admin button that calls /auth/demo-login', async () => {
    const fetchMock = vi.fn(async (url) =>
      url.endsWith('/auth/demo-login')
        ? respond(200, { data: { access_token: 't' } })
        : respond(200, { data: { role: 'admin' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider supabase={null}><SignInPage config={{ apiBaseUrl: 'x', demoMode: true }} passwordEnabled={false} /></AuthProvider>);
    await userEvent.click(screen.getByRole('button', { name: /demo admin/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/demo-login$/);
  });

  it('warns when the API URL is missing', () => {
    render(<AuthProvider supabase={null}><SignInPage config={{ apiBaseUrl: '', demoMode: false }} passwordEnabled /></AuthProvider>);
    expect(screen.getByText(/VITE_API_BASE_URL is not set/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
