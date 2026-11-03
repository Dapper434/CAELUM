import { api } from './client';

export const listCustodyEvents = (transferId) => api.get(`/transfers/${transferId}/custody`);

/** QR status. refresh=true signs a new QR (stage packed or courier_assigned only). */
export const getQrStatus = (transferId, { refresh = false } = {}) =>
  api.get(`/transfers/${transferId}/qr`, { query: { refresh: refresh ? 'true' : undefined } });

/** Short-lived signed link for a custody photo. Never a public URL. */
export const getPhotoUrl = (transferId, eventId, expiresIn = 300) =>
  api.get(`/transfers/${transferId}/custody/${eventId}/photo-url`, {
    query: { expires_in: Math.min(3600, Math.max(30, expiresIn)) },
  });

export const checkSeal = (transferId, sealNumber) =>
  api.post(`/transfers/${transferId}/seal-check`, { seal_number: sealNumber });
