import { describe, it, expect, vi } from 'vitest';
import { createApiClient, ApiError } from './client';
import { api } from './client';
import { inviteUser, listUsers, resendInvite, disableUser, validateInvite, userErrorMessage, nextUsersPage } from './users';

const respond = (status, body) => ({ ok: status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(body) });

describe('users api', () => {
  it('lists with page/per_page and returns meta', async () => {
    const fetchImpl = vi.fn(async () => respond(200, { data: [{ user_id: 'u1' }], meta: { page: 2, per_page: 50, count: 1, has_more: false, next_page: null } }));
    const client = createApiClient({ baseUrl: 'https://x/api/v1', fetchImpl });
    vi.spyOn(api, 'getList').mockImplementation((p, o) => client.getList(p, o));
    const res = await listUsers({ page: 2 });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://x/api/v1/admin/users?page=2&per_page=50');
    expect(res.meta.has_more).toBe(false);
  });

  it('invite sends facility only for donor/recipient and courier_id only for courier', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    await inviteUser({ email: ' a@b.co ', role: 'donor', full_name: 'A', facility_id: 'f1', courier_id: 'c1' });
    expect(post).toHaveBeenCalledWith('/admin/users/invite', { email: 'a@b.co', role: 'donor', full_name: 'A', facility_id: 'f1' });
    expect(Object.keys(post.mock.calls[0][1])).not.toEqual(expect.arrayContaining(['redirectTo']));
    expect(post.mock.calls[0][1]).not.toHaveProperty('redirect_to');
    await inviteUser({ email: 'c@b.co', role: 'courier', full_name: 'C', facility_id: 'f1', courier_id: 'c1' });
    expect(post).toHaveBeenLastCalledWith('/admin/users/invite', { email: 'c@b.co', role: 'courier', full_name: 'C', courier_id: 'c1' });
    await inviteUser({ email: 'd@b.co', role: 'courier', full_name: '', courier_id: '' });
    expect(post).toHaveBeenLastCalledWith('/admin/users/invite', { email: 'd@b.co', role: 'courier' });
    await resendInvite('u1'); await disableUser('u1');
    expect(post).toHaveBeenCalledWith('/admin/users/u1/resend-invite');
    expect(post).toHaveBeenCalledWith('/admin/users/u1/disable');
  });

  it('validates and maps errors', () => {
    expect(validateInvite({ email: 'x', role: 'recipient', full_name: '' })).toEqual({
      email: expect.any(String), facility_id: expect.any(String),
    });
    expect(validateInvite({ email: 'a@b.co', role: 'admin', full_name: '' })).toEqual({});
    expect(validateInvite({ email: 'a@b.co', role: 'courier', full_name: '' })).toEqual({});
    expect(userErrorMessage(new ApiError(409, 'conflict', 'x'))).toBe('That email is already registered.');
    expect(userErrorMessage(new ApiError(400, 'bad', 'facility_id is required'))).toBe('facility_id is required');
    expect(userErrorMessage(new ApiError(0, 'network_error', 'x'))).toMatch(/^Network error/);
    for (const action of ['invite', 'list', 'resend', 'disable']) expect(userErrorMessage(new ApiError(403, 'forbidden', 'x'), action)).toMatch(/not an admin/);
    expect(userErrorMessage(new ApiError(404, 'not_found', 'x'), 'resend')).toBe('That user no longer exists.');
    expect(userErrorMessage(new ApiError(409, 'already_confirmed', 'x'), 'resend')).toBe('That user has already confirmed their account.');
    expect(nextUsersPage({ has_more: false, next_page: null })).toBeNull();
    expect(nextUsersPage({ page: 1, has_more: true, next_page: 2 })).toBe(2);
    expect(nextUsersPage({ page: 3, has_more: true })).toBe(4);
  });
});
