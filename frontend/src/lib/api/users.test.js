import { describe, it, expect, vi } from 'vitest';
import { createApiClient, ApiError } from './client';
import { api } from './client';
import { inviteUser, listUsers, resendInvite, disableUser, validateInvite, userErrorMessage, hasMoreUsers } from './users';

const respond = (status, body) => ({ ok: status < 300, status, headers: { get: () => null }, text: async () => JSON.stringify(body) });

describe('users api', () => {
  it('lists with limit/offset and returns meta', async () => {
    const fetchImpl = vi.fn(async () => respond(200, { data: [{ user_id: 'u1' }], meta: { total: 1 } }));
    const client = createApiClient({ baseUrl: 'https://x/api/v1', fetchImpl });
    vi.spyOn(api, 'getList').mockImplementation((p, o) => client.getList(p, o));
    const res = await listUsers({ offset: 50 });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://x/api/v1/admin/users?limit=50&offset=50');
    expect(res).toEqual({ data: [{ user_id: 'u1' }], meta: { total: 1 } });
  });

  it('invite sends facility only for donor/recipient and courier_id only for courier', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    await inviteUser({ email: ' a@b.co ', role: 'donor', full_name: 'A', facility_id: 'f1', courier_id: 'c1' });
    expect(post).toHaveBeenCalledWith('/admin/users/invite', { email: 'a@b.co', role: 'donor', full_name: 'A', facility_id: 'f1' });
    await inviteUser({ email: 'c@b.co', role: 'courier', full_name: 'C', facility_id: 'f1', courier_id: 'c1' });
    expect(post).toHaveBeenLastCalledWith('/admin/users/invite', { email: 'c@b.co', role: 'courier', full_name: 'C', courier_id: 'c1' });
    await resendInvite('u1'); await disableUser('u1');
    expect(post).toHaveBeenCalledWith('/admin/users/u1/resend-invite');
    expect(post).toHaveBeenCalledWith('/admin/users/u1/disable');
  });

  it('validates and maps errors', () => {
    expect(validateInvite({ email: 'x', role: 'recipient', full_name: '' })).toEqual({
      email: expect.any(String), full_name: expect.any(String), facility_id: expect.any(String),
    });
    expect(validateInvite({ email: 'a@b.co', role: 'admin', full_name: 'A' })).toEqual({});
    expect(userErrorMessage(new ApiError(409, 'conflict', 'x'))).toBe('That email is already registered.');
    expect(userErrorMessage(new ApiError(400, 'bad', 'facility_id is required'))).toBe('facility_id is required');
    expect(userErrorMessage(new ApiError(0, 'network_error', 'x'))).toMatch(/^Network error/);
    expect(hasMoreUsers({ has_more: false }, 50)).toBe(false);
    expect(hasMoreUsers({ total: 60, offset: 0 }, 50)).toBe(true);
    expect(hasMoreUsers({}, 10)).toBe(false);
  });
});
