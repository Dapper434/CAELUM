import { api } from './client';

export const REQUEST_STATUSES = ['suggested', 'open', 'offered', 'matched', 'fulfilled', 'cancelled', 'dismissed'];

export const listRequests = (status) => api.get('/requests', { query: { status } });
export const getRequest = (id) => api.get(`/requests/${id}`);
export const confirmRequest = (id, changes = {}) => api.post(`/requests/${id}/confirm`, changes);
export const dismissRequest = (id, reason) => api.post(`/requests/${id}/dismiss`, reason ? { reason } : {});
export const cancelRequest = (id, reason) => api.post(`/requests/${id}/cancel`, reason ? { reason } : {});
export const getCandidates = (id) => api.get(`/requests/${id}/candidates`);
export const createOffer = (id, donorFacilityId) =>
  api.post(`/requests/${id}/offers`, { donor_facility_id: donorFacilityId });

/** Which actions the state machine allows for a request status. */
export function requestActions(status) {
  return {
    confirm: status === 'suggested',
    dismiss: status === 'suggested',
    cancel: ['suggested', 'open', 'offered'].includes(status),
    offer: status === 'open',
  };
}
