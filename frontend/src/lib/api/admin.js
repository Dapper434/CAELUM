import { api } from './client';

export const getOverview = () => api.get('/admin/overview');
export const getNetworkMap = () => api.get('/admin/map');
export const getFeed = (afterSeq = 0, limit = 50) => api.get('/admin/feed', { query: { after_seq: afterSeq, limit } });
export const runSweep = () => api.post('/admin/jobs/sweep');

/** Global audit log, newest first (max 500 per call). */
export const listAudit = ({ entityType, entityId, action, afterSeq, limit = 100 } = {}) =>
  api.getList('/audit', {
    query: { entity_type: entityType, entity_id: entityId, action, after_seq: afterSeq, limit },
  });
export const verifyAudit = () => api.get('/audit/verify');

export const getColdChainBands = () => api.get('/cold-chain/bands');
