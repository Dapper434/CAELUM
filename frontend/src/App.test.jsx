import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const auth = { status: 'signedIn', me: { email: 'admin@caelum.demo', role: 'admin' }, signOut: vi.fn(), signInWithPassword: vi.fn() };
vi.mock('./auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('./components/LeafletMap', () => ({ default: () => <div data-testid="map" /> }));
vi.mock('./pages/OverviewPage', () => ({ default: () => <div>overview-page</div> }));
vi.mock('./pages/AuditPage', () => ({ default: () => <div>audit-page</div> }));
vi.mock('./pages/SignInPage', () => ({ default: () => <div>sign-in-page</div> }));

const { api } = await import('./lib/api/client');
const { default: App } = await import('./App');

describe('App shell', () => {
  beforeEach(() => {
    vi.spyOn(api, 'request').mockResolvedValue({ status: 'ok', version: '1.2.0' });
    vi.spyOn(api, 'get').mockResolvedValue({ open_alerts: 2, active_transfers: 3, requests: { open: 1 } });
  });

  it('shows sign-in when signed out', () => {
    auth.status = 'signedOut';
    render(<App />);
    expect(screen.getByText('sign-in-page')).toBeInTheDocument();
    auth.status = 'signedIn';
  });

  it('navigates, shows badges and API version, and signs out', async () => {
    render(<App />);
    expect(screen.getByText('overview-page')).toBeInTheDocument();
    expect(await screen.findByText('API online · v1.2.0')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /audit log/i }));
    expect(screen.getByText('audit-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Operating region')).toHaveValue('');
    await userEvent.click(screen.getByTitle('Sign out'));
    expect(auth.signOut).toHaveBeenCalled();
  });
});
