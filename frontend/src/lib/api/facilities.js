import { api } from './client';

export const CONTACT_FIELDS = ['contact_name', 'contact_phone', 'address'];
export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,19}$/;

export const listFacilities = (regionCode) => api.get('/facilities', { query: { region_code: regionCode } });
export const getFacility = (id) => api.get(`/facilities/${id}`);

/** PATCH /facilities/{id}: only contact_name, contact_phone, address (string or null). */
export function updateFacilityContacts(id, changes) {
  const body = {};
  for (const key of CONTACT_FIELDS) {
    if (key in changes) {
      const value = changes[key];
      body[key] = value === undefined || (typeof value === 'string' && value.trim() === '') ? null : String(value).trim();
    }
  }
  return api.patch(`/facilities/${id}`, body);
}

/** Validates contact edits with the contract limits before sending. */
export function validateContacts({ contact_name, contact_phone, address }) {
  const errors = {};
  if (contact_name && contact_name.trim().length > 120) errors.contact_name = 'At most 120 characters.';
  if (contact_phone && !PHONE_PATTERN.test(contact_phone.trim())) errors.contact_phone = 'Use digits, spaces, ( ) or -, optional leading +.';
  if (address && address.trim().length > 300) errors.address = 'At most 300 characters.';
  return errors;
}

/** Facility-scoped audit with before_seq paging. */
export const getFacilityAudit = (id, { limit = 50, beforeSeq } = {}) =>
  api.getList(`/facilities/${id}/audit`, { query: { limit, before_seq: beforeSeq } });
