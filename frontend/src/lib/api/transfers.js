import { api } from './client';

export const TRANSFER_STAGES = ['accepted', 'packed', 'courier_assigned', 'in_transit', 'arrived', 'delivered', 'cancelled'];
export const ACTIVE_STAGES = ['accepted', 'packed', 'courier_assigned', 'in_transit', 'arrived'];

export const listTransfers = ({ stage, active } = {}) =>
  api.get('/transfers', { query: { stage, active: active ? 'true' : undefined } });
export const getTransfer = (id) => api.get(`/transfers/${id}`);
export const assignCourier = (id, courierId) => api.post(`/transfers/${id}/assign-courier`, { courier_id: courierId });
export const cancelTransfer = (id, reason) => api.post(`/transfers/${id}/cancel`, reason ? { reason } : {});
export const getTracking = (id) => api.get(`/transfers/${id}/tracking`);
export const getTransferAudit = (id) => api.get(`/transfers/${id}/audit`);
export const getTemperatureReadings = (id) => api.get(`/transfers/${id}/temperature`);

/** Admin may cancel any time before delivery; assign only when packed. */
export function transferActions(transfer) {
  const stage = transfer?.stage;
  return {
    assignCourier: stage === 'packed',
    cancel: Boolean(stage) && stage !== 'delivered' && stage !== 'cancelled',
  };
}

/** Deadline that currently applies to a transfer (pack or courier accept). */
export function transferDeadline(transfer) {
  if (!transfer) return null;
  if (transfer.stage === 'accepted' && transfer.pack_deadline) return { label: 'Pack by', at: transfer.pack_deadline };
  if (transfer.stage === 'courier_assigned' && !transfer.courier_accepted_at && transfer.courier_accept_deadline) {
    return { label: 'Courier must accept by', at: transfer.courier_accept_deadline };
  }
  return null;
}
