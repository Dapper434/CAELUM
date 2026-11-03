import { api } from './client';

export const OFFER_STATUSES = ['pending', 'held', 'accepted', 'declined', 'expired', 'withdrawn', 'lapsed', 'packed'];
export const DECLINE_REASONS = ['insufficient_stock', 'reserved_locally', 'no_courier', 'quality_concern', 'other'];

export const listOffers = ({ status, requestId, direction } = {}) =>
  api.get('/offers', { query: { status, request_id: requestId, direction } });
export const getOffer = (id) => api.get(`/offers/${id}`);
export const holdOffer = (id) => api.post(`/offers/${id}/hold`);
export const acceptOffer = (id) => api.post(`/offers/${id}/accept`, {});
export const declineOffer = (id, reasonCode, note) =>
  api.post(`/offers/${id}/decline`, note ? { reason_code: reasonCode, note } : { reason_code: reasonCode });

/** pending → hold/accept/decline; held → accept/decline (one more hold extension allowed). */
export function offerActions(offer) {
  const s = offer?.status;
  return {
    hold: s === 'pending' || (s === 'held' && (offer.hold_extensions ?? 0) < 1),
    accept: s === 'pending' || s === 'held',
    decline: s === 'pending' || s === 'held',
  };
}
