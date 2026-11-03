import { api } from './client';

export const VEHICLE_TYPES = ['boda', 'car', 'van', 'bicycle', 'ambulance'];
export const LICENCE_CLASSES = ['A', 'A1', 'A2', 'A3', 'B', 'B1', 'B2', 'B3', 'C', 'C1', 'D', 'D1', 'E', 'F', 'G'];
export const EDITABLE_FIELDS = [
  'full_name', 'phone', 'vehicle_type', 'vehicle_plate', 'cold_box_id', 'region_code', 'home_facility_id',
  'training_certified', 'is_active', 'licence_number', 'licence_class', 'licence_expiry', 'emergency_contact',
];

export const listCouriers = (status) => api.get('/couriers', { query: { status } });
export const createCourier = (profile) => api.post('/couriers', profile);
export const updateCourier = (id, changes) => api.patch(`/couriers/${id}`, changes);
export const listCourierLocations = (id, limit = 100) => api.get(`/couriers/${id}/locations`, { query: { limit } });
export const listCourierDeclineReasons = () => api.get('/couriers/decline-reasons');

export function validateLicence({ licence_class, licence_expiry }) {
  const errors = {};
  if (licence_class && !LICENCE_CLASSES.includes(licence_class)) errors.licence_class = 'Pick an NTSA class.';
  if (licence_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(licence_expiry)) errors.licence_expiry = 'Use YYYY-MM-DD.';
  return errors;
}

/** True when a licence expiry date (YYYY-MM-DD) is before today. */
export function licenceExpired(expiry, now = new Date()) {
  if (!expiry) return false;
  return expiry < now.toISOString().slice(0, 10);
}
