import { api } from './client';

export const USER_ROLES = ['admin', 'donor', 'recipient', 'courier'];
export const FACILITY_ROLES = ['donor', 'recipient'];
export const USERS_PAGE_SIZE = 50;

export const USER_STATUSES = ['invited', 'confirmed', 'disabled'];

/** GET /admin/users (contract v1.3.0 §5.12): page/per_page, meta {page, per_page, count, has_more, next_page}. */
export const listUsers = ({ page = 1, perPage = USERS_PAGE_SIZE } = {}) =>
  api.getList('/admin/users', { query: { page, per_page: perPage } });

export function inviteUser({ email, role, full_name, facility_id, courier_id }) {
  const body = { email: email.trim(), role };
  if ((full_name || '').trim()) body.full_name = full_name.trim();
  if (FACILITY_ROLES.includes(role)) body.facility_id = facility_id;
  if (role === 'courier' && courier_id) body.courier_id = courier_id;
  return api.post('/admin/users/invite', body);
}
export const resendInvite = (id) => api.post(`/admin/users/${id}/resend-invite`);
export const disableUser = (id) => api.post(`/admin/users/${id}/disable`);

export function validateInvite({ email, role, full_name, facility_id }) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())) errors.email = 'Enter a valid email.';
  if (!USER_ROLES.includes(role)) errors.role = 'Pick a role.';
  if (FACILITY_ROLES.includes(role) && !facility_id) errors.facility_id = 'Pick a facility for donor and recipient users.';
  return errors;
}

/**
 * Turns an ApiError from the user endpoints into a sentence for the admin.
 * `action` is 'invite' | 'resend' | 'disable' | 'list'.
 */
export function userErrorMessage(err, action = 'invite') {
  if (!err) return '';
  if (err.status === 403) return 'Your account is not an admin, so it cannot manage users.';
  if (err.status === 404 && action !== 'list') return 'That user no longer exists.';
  if (err.status === 409 && action === 'resend') return 'That user has already confirmed their account.';
  if (err.status === 409) return 'That email is already registered.';
  if (err.status === 400) return err.message || 'The server rejected that input.';
  if (err.status === 0 || err.code === 'network_error') return 'Network error: the CAELUM API did not answer. Check your connection and try again.';
  return err.message || 'Something went wrong.';
}

/** Next page number from meta, or null when there is none. */
export function nextUsersPage(meta) {
  if (!meta?.has_more) return null;
  return meta.next_page || (meta.page || 1) + 1;
}
