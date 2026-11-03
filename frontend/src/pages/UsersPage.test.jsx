import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, ApiError } from '../lib/api/client';
import UsersPage from './UsersPage';

const users = [
  { user_id: 'u1', email: 'nurse@knh.ke', role: 'recipient', full_name: 'A. Wanjiru', facility_id: 'f1', facility_name: 'KNH', last_sign_in_at: null, status: 'invited' },
  { user_id: 'u2', email: 'ops@caelum.ke', role: 'admin', full_name: 'B. Mwangi', facility_id: null, facility_name: null, last_sign_in_at: '2026-11-03T06:00:00Z', status: 'confirmed' },
  { user_id: 'u3', email: 'gone@caelum.ke', role: 'courier', full_name: 'D', facility_id: null, facility_name: null, courier_id: 'c1', last_sign_in_at: null, status: 'disabled' },
];

function mockApi() {
  vi.spyOn(api, 'getList').mockResolvedValue({ data: users, meta: { page: 1, per_page: 50, count: 3, has_more: false, next_page: null } });
  vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/facilities' ? [{ id: 'f1', name: 'KNH' }] : []));
}

describe('UsersPage', () => {
  it('lists users with role, facility, status and last sign-in', async () => {
    mockApi();
    render(<UsersPage />);
    expect(await screen.findByText('nurse@knh.ke')).toBeInTheDocument();
    expect(screen.getByText('KNH')).toBeInTheDocument();
    expect(screen.getByText(/^invited$/i)).toBeInTheDocument();
    expect(screen.getByText(/^disabled$/i)).toBeInTheDocument();
    expect(screen.getByText(/^confirmed$/i)).toBeInTheDocument();
    expect(screen.getAllByText('Never')).toHaveLength(2);
    expect(api.getList).toHaveBeenCalledWith('/admin/users', { query: { page: 1, per_page: 50 } });
  });

  it('requires a facility for recipients and invites', async () => {
    mockApi();
    const post = vi.spyOn(api, 'post').mockResolvedValue({ user_id: 'u3', email: 'new@knh.ke' });
    render(<UsersPage />);
    await userEvent.click(screen.getByRole('button', { name: /invite user/i }));
    const form = screen.getByRole('form', { name: 'Invite user' });
    await userEvent.type(within(form).getByLabelText('Email'), 'new@knh.ke');
    await userEvent.type(within(form).getByLabelText('Full name (optional)'), 'C. Otieno');
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
    await userEvent.type(within(form).getByLabelText('Full name (optional)'), 'B');
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
    expect(screen.queryByRole('button', { name: 'Resend invite to gone@caelum.ke' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable gone@caelum.ke' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Disable ops@caelum.ke' }));
    expect(post).not.toHaveBeenCalledWith('/admin/users/u2/disable');
    await userEvent.click(screen.getByRole('button', { name: 'Disable ops@caelum.ke' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/admin/users/u2/disable'));
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('loads the next page from meta.next_page', async () => {
    const getList = vi.spyOn(api, 'getList')
      .mockResolvedValueOnce({ data: [users[0]], meta: { page: 1, per_page: 50, count: 1, has_more: true, next_page: 2 } })
      .mockResolvedValueOnce({ data: [users[1]], meta: { page: 2, per_page: 50, count: 1, has_more: false, next_page: null } });
    render(<UsersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('ops@caelum.ke')).toBeInTheDocument();
    expect(screen.getByText('nurse@knh.ke')).toBeInTheDocument();
    expect(getList).toHaveBeenLastCalledWith('/admin/users', { query: { page: 2, per_page: 50 } });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('explains 403 and resend 409', async () => {
    mockApi();
    vi.spyOn(api, 'post').mockRejectedValue(new ApiError(409, 'already_confirmed', 'x'));
    render(<UsersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Resend invite to nurse@knh.ke' }));
    expect(await screen.findByText('That user has already confirmed their account.')).toBeInTheDocument();
  });

  it('invites a courier without a courier id', async () => {
    mockApi();
    const post = vi.spyOn(api, 'post').mockResolvedValue({ email: 'r@c.ke' });
    render(<UsersPage />);
    await userEvent.click(screen.getByRole('button', { name: /invite user/i }));
    const form = screen.getByRole('form', { name: 'Invite user' });
    await userEvent.type(within(form).getByLabelText('Email'), 'r@c.ke');
    await userEvent.selectOptions(within(form).getByLabelText('Role'), 'courier');
    expect(within(form).getByText(/server creates a courier profile/i)).toBeInTheDocument();
    await userEvent.click(within(form).getByRole('button', { name: /send invite/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/admin/users/invite', { email: 'r@c.ke', role: 'courier' }));
  });
});
