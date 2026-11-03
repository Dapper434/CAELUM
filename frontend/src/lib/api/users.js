import { api } from './client';

export const USER_ROLES = ['admin', 'donor', 'recipient', 'courier'];
export const FACILITY_ROLES = ['donor', 'recipient'];
export const USERS_PAGE_SIZE = 50;

/**
 * GET /admin/users. Assumes limit/offset paging and the usual {data, meta}
 * envelope (meta may carry total / has_more); see docs/CONTRACT_GAPS.md.
 */
export const listUsers = ({ limit = USERS_PAGE_SIZE, offset = 0, role } = {}) =>
  api.getList('/admin/users', { query: { limit, offset, role } });

export function inviteUser({ email, role, full_name, facility_id, courier_id }) {
  const body = { email: email.trim(), role, full_name: full_name.trim() };
  if (FACILITY_ROLES.includes(role)) body.facility_id = facility_id;
  if (role === 'courier' && courier_id) body.courier_id = courier_id;
  return api.post('/admin/users/invite', body);
}
export const resendInvite = (id) => api.post(`/admin/users/${id}/resend-invite`);
export const disableUser = (id) => api.post(`/admin/users/${id}/disable`);

export function validateInvite({ email, role, full_name, facility_id }) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())) errors.email = 'Enter a valid email.';
  if (!(full_name || '').trim()) errors.full_name = 'Full name is required.';
  if (!USER_ROLES.includes(role)) errors.role = 'Pick a role.';
  if (FACILITY_ROLES.includes(role) && !facility_id) errors.facility_id = 'Pick a facility for donor and recipient users.';
  return errors;
}

/** Turns an ApiError from the user endpoints into a sentence for the admin. */
export function userErrorMessage(err) {
  if (!err) return '';
  if (err.status === 409) return 'That email is already registered.';
  if (err.status === 400) return err.message || 'The server rejected that input.';
  if (err.status === 0 || err.code === 'network_error') return 'Network error: the CAELUM API did not answer. Check your connection and try again.';
  return err.message || 'Something went wrong.';
}

/** Has another page if meta says so, else when the page came back full. */
export function hasMoreUsers(meta, pageLength, limit = USERS_PAGE_SIZE) {
  if (meta && typeof meta.has_more === 'boolean') return meta.has_more;
  if (meta && typeof meta.total === 'number' && typeof meta.offset === 'number') return meta.offset + pageLength < meta.total;
  return pageLength >= limit;
}
