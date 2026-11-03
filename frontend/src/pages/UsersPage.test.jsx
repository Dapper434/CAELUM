import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, ApiError } from '../lib/api/client';
import UsersPage from './UsersPage';

const users = [
  { user_id: 'u1', email: 'nurse@knh.ke', role: 'recipient', full_name: 'A. Wanjiru', facility_id: 'f1', facility_name: 'KNH', last_sign_in_at: null, confirmed: false },
  { user_id: 'u2', email: 'ops@caelum.ke', role: 'admin', full_name: 'B. Mwangi', facility_id: null, facility_name: null, last_sign_in_at: '2026-11-03T06:00:00Z', confirmed: true },
];

function mockApi() {
  vi.spyOn(api, 'getList').mockResolvedValue({ data: users, meta: {} });
  vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/facilities' ? [{ id: 'f1', name: 'KNH' }] : []));
}

describe('UsersPage', () => {
  it('lists users with role, facility, status and last sign-in', async () => {
    mockApi();
    render(<UsersPage />);
    expect(await screen.findByText('nurse@knh.ke')).toBeInTheDocument();
    expect(screen.getByText('KNH')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(api.getList).toHaveBeenCalledWith('/admin/users', { query: { limit: 50, offset: 0, role: undefined } });
  });

  it('requires a facility for recipients and invites', async () => {
    mockApi();
    const post = vi.spyOn(api, 'post').mockResolvedValue({ user_id: 'u3', email: 'new@knh.ke' });
    render(<UsersPage />);
    await userEvent.click(screen.getByRole('button', { name: /invite user/i }));
    const form = screen.getByRole('form', { name: 'Invite user' });
    await userEvent.type(within(form).getByLabelText('Email'), 'new@knh.ke');
    await userEvent.type(within(form).getByLabelText('Full name'), 'C. Otieno');
    await userEvent.selectOptions(within(form).getByLabelText('Role'), 'recipient');
    await userEvent.click(within(form).getByRole('button', { name: /send invite/i }));
    expect(await within(form).findByText(/pick a facility for donor/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    await screen.findByRole('option', { name: 'KNH' });
    await userEvent.selectOptions(within(form).getByLabelText('Facility'), 'f1');
    await userEvent.click(within(form).getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/admin/users/invite', { email: 'new@knh.ke', role: 'recipient', full_name: 'C. Otieno', facility_id: 'f1' }));
    expect(await screen.findByText('Invite sent to new@knh.ke.')).toBeInTheDocument();
  });

  it.each([
    [new ApiError(409, 'conflict', 'dup'), 'That email is already registered.'],
    [new ApiError(400, 'validation_error', 'role must be one of admin, donor'), 'role must be one of admin, donor'],
    [new ApiError(0, 'network_error', 'x'), /^Network error/],
  ])('shows a clear invite error (%#)', async (error, text) => {
    mockApi();
    vi.spyOn(api, 'post').mockRejectedValue(error);
    render(<UsersPage />);
    await userEvent.click(screen.getByRole('button', { name: /invite user/i }));
    const form = screen.getByRole('form', { name: 'Invite user' });
    await userEvent.type(within(form).getByLabelText('Email'), 'ops@caelum.ke');
    await userEvent.type(within(form).getByLabelText('Full name'), 'B');
    await userEvent.click(within(form).getByRole('button', { name: /send invite/i }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(text);
  });

  it('resends invites and confirms before disabling', async () => {
    mockApi();
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<UsersPage confirm={confirm} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Resend invite to nurse@knh.ke' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/admin/users/u1/resend-invite'));
    expect(screen.queryByRole('button', { name: 'Resend invite to ops@caelum.ke' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Disable ops@caelum.ke' }));
    expect(post).not.toHaveBeenCalledWith('/admin/users/u2/disable');
    await userEvent.click(screen.getByRole('button', { name: 'Disable ops@caelum.ke' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/admin/users/u2/disable'));
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});
