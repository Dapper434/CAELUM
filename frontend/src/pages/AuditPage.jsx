import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { listAudit, verifyAudit } from '../lib/api/admin';
import { useApiData } from '../hooks/useApiData';
import { Button, Card, ErrorNote, Field, Loading, PageHeader, inputClass } from '../components/ui';
import AuditList from '../components/AuditList';
import { shortHash } from '../lib/format';

const PAGE = 25;

export function ChainVerify() {
  const { data, error, loading, reload } = useApiData(verifyAudit, []);
  const ok = data?.valid;
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm">
          {data && (ok ? <ShieldCheck className="w-4 h-4 text-status-emerald" /> : <ShieldAlert className="w-4 h-4 text-status-crimson" />)}
          {loading && !data ? 'Verifying chain…' : data ? (ok ? 'Hash chain intact' : `Chain broken at #${data.broken_at_seq}`) : 'Chain verify'}
        </div>
        <Button variant="ghost" onClick={reload} disabled={loading}>Re-verify</Button>
      </div>
      <ErrorNote error={error} />
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Entries">{data.length}</Field>
          <Field label="Head hash"><span className="font-mono" title={data.head_hash}>{shortHash(data.head_hash, 16)}</span></Field>
          <Field label="Broken at">{data.broken_at_seq ?? '—'}</Field>
        </div>
      )}
    </Card>
  );
}

/**
 * Global audit log. The API returns newest first with at most 500 entries and has
 * no before_seq on /audit (see docs/CONTRACT_GAPS.md), so we fetch up to `limit` and page in the browser.
 */
export default function AuditPage() {
  const [filters, setFilters] = useState({ entityType: '', entityId: '', action: '' });
  const [applied, setApplied] = useState(filters);
  const [limit, setLimit] = useState(200);
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useApiData(
    () => listAudit({ entityType: applied.entityType || undefined, entityId: applied.entityId || undefined, action: applied.action || undefined, limit }),
    [applied, limit],
  );
  const entries = data?.data || [];
  const pages = Math.max(1, Math.ceil(entries.length / PAGE));
  const shown = entries.slice(page * PAGE, page * PAGE + PAGE);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" subtitle="Append-only, hash-chained record of every change." onRefresh={reload} loading={loading} />
      <ChainVerify />
      <Card className="p-4 space-y-3">
        <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); setPage(0); setApplied(filters); }}>
          <input aria-label="Entity type" placeholder="Entity type (e.g. transfer)" className={`${inputClass} w-44`} value={filters.entityType} onChange={set('entityType')} />
          <input aria-label="Entity id" placeholder="Entity id" className={`${inputClass} w-56`} value={filters.entityId} onChange={set('entityId')} />
          <input aria-label="Action" placeholder="Action (e.g. offer.accepted)" className={`${inputClass} w-48`} value={filters.action} onChange={set('action')} />
          <select aria-label="Fetch limit" className={`${inputClass} w-28`} value={limit} onChange={(e) => { setPage(0); setLimit(Number(e.target.value)); }}>
            {[100, 200, 500].map((n) => <option key={n} value={n}>Last {n}</option>)}
          </select>
          <Button type="submit">Filter</Button>
        </form>
        <ErrorNote error={error} onRetry={reload} />
        {loading && !data ? <Loading /> : <AuditList entries={shown} />}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{entries.length} entries{entries.length >= limit ? ` (newest ${limit} only)` : ''}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Newer</Button>
            <span>Page {page + 1} / {pages}</span>
            <Button variant="ghost" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Older</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
