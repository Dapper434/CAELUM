import { api } from './client';

export const listInventory = (filters = {}) =>
  api.get('/inventory', {
    query: {
      facility_id: filters.facilityId,
      blood_group: filters.bloodGroup,
      product_type: filters.productType,
      status: filters.status,
    },
  });

const CORRECTION_FIELDS = ['lot_number', 'expiry_date', 'storage_temp_c'];

/**
 * PATCH /inventory/{id}. A reason is required when lot, expiry or
 * temperature change; the API logs these as inventory.corrected.
 */
export function correctInventoryUnit(id, changes, reason) {
  const body = { ...changes };
  const isCorrection = CORRECTION_FIELDS.some((key) => key in body);
  if (isCorrection && !(reason && reason.trim())) {
    throw new Error('A reason is required to correct lot, expiry or storage temperature.');
  }
  if (reason && reason.trim()) body.reason = reason.trim();
  return api.patch(`/inventory/${id}`, body);
}

/** Logged corrections come from the audit log (action inventory.corrected). */
export const listInventoryCorrections = ({ unitId, limit = 100 } = {}) =>
  api.get('/audit', {
    query: { action: 'inventory.corrected', entity_type: unitId ? 'unit' : undefined, entity_id: unitId, limit },
  });
