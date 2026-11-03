import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from './ResetPasswordPage';

function fakeSupabase({ session = null } = {}) {
  let listener = null;
  return {
    emit: (event, s) => act(() => listener(event, s)),
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn((cb) => { listener = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
      updateUser: vi.fn(async () => ({ error: null })),
    },
  };
}

describe('ResetPasswordPage', () => {
  it.each(['PASSWORD_RECOVERY', 'SIGNED_IN'])('accepts the %s link session, validates, updates and continues', async (event) => {
    const supabase = fakeSupabase();
    const onDone = vi.fn();
    render(<ResetPasswordPage supabase={supabase} onDone={onDone} waitMs={10000} />);
    expect(screen.getByText(/checking your link/i)).toBeInTheDocument();
    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled());
    supabase.emit(event, { access_token: 't' });
    await userEvent.type(await screen.findByLabelText('New password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8/);
    await userEvent.clear(screen.getByLabelText('New password'));
    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('New password'), 'new-password-1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'new-password-2');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/do not match/);
    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Confirm password'), 'new-password-1');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-1' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('uses an existing session', async () => {
    render(<ResetPasswordPage supabase={fakeSupabase({ session: { access_token: 't' } })} waitMs={10000} />);
    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
  });

  it('shows a clear state when there is no valid link', async () => {
    render(<ResetPasswordPage supabase={fakeSupabase()} waitMs={10} />);
    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });
});
