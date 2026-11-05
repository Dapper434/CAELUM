import { api } from './client';
import { config } from '../config';
import { supabase } from '../supabase';

export const getOverview = () => api.get('/admin/overview');
export const getNetworkMap = () => api.get('/admin/map');
export const getFeed = (afterSeq = 0, limit = 50) => api.get('/admin/feed', { query: { after_seq: afterSeq, limit } });
export const runSweep = () => api.post('/admin/jobs/sweep');

/** Build query for audit list/summary/export. */
export function auditQuery({
  entityType, entityId, action, actorRole, facilityId,
  afterSeq, beforeSeq, limit = 50, important, q, window, from, to,
} = {}) {
  return {
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_role: actorRole,
    facility_id: facilityId,
    after_seq: afterSeq,
    before_seq: beforeSeq,
    limit,
    important: important ? 1 : undefined,
    q,
    window,
    from,
    to,
  };
}

/** Global audit log, newest first, server-paged via before_seq. */
export const listAudit = (opts = {}) =>
  api.getList('/audit', { query: auditQuery(opts) });

export const getAuditSummary = (opts = {}) =>
  api.get('/audit/summary', { query: auditQuery(opts) });

export const verifyAudit = (force = false) =>
  api.get('/audit/verify', { query: force ? { force: 1 } : {} });

/** Download CSV for current filters (admin token required). Returns a Blob. */
export async function exportAuditCsv(opts = {}) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const access = data?.session?.access_token;
  const qs = new URLSearchParams();
  Object.entries(auditQuery({ ...opts, limit: opts.limit || 2000 })).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.set(k, String(v));
  });
  const res = await fetch(`${config.apiBaseUrl}/audit/export?${qs}`, {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const j = await res.json();
      message = j?.error?.message || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.blob();
}

export const getColdChainBands = () => api.get('/cold-chain/bands');
