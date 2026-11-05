import React, { useCallback, useEffect, useState } from 'react';
import { Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import { listAudit, verifyAudit, getAuditSummary, exportAuditCsv } from '../lib/api/admin';
import { listFacilities } from '../lib/api/facilities';
import { useApiData } from '../hooks/useApiData';
import { Button, Card, ErrorNote, Field, Loading, PageHeader, Pill, inputClass } from '../components/ui';
import AuditList from '../components/AuditList';
import { shortHash } from '../lib/format';
import { actionLabel, categoryLabel } from '../lib/auditLabels';

const PAGE = 50;

export function ChainVerify() {
  const { data, error, loading, reload } = useApiData(() => verifyAudit(false), []);
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

function SummaryStrip({ summary, loading }) {
  if (loading && !summary) return <Card className="p-3 text-xs text-slate-500">Loading summary…</Card>;
  if (!summary) return null;
  const cats = Object.entries(summary.by_category || {});
  return (
    <Card className="p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-bold text-slate-800 dark:text-slate-100">Last {summary.window}: {summary.total} events</span>
        <Pill tone={summary.important ? 'red' : 'green'}>{summary.important} important</Pill>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cats.map(([cat, n]) => (
          <span key={cat} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-inset dark:bg-slate-800 border border-border-warm dark:border-slate-700">
            {categoryLabel(cat)} · {n}
          </span>
        ))}
      </div>
      {summary.top_actions?.length > 0 && (
        <div className="text-[11px] text-slate-500 truncate">
          Top: {summary.top_actions.slice(0, 5).map((t) => `${actionLabel(t.action)} (${t.count})`).join(' · ')}
        </div>
      )}
    </Card>
  );
}

/**
 * Global audit log. Server-paged with before_seq; important-first by default.
 */
export default function AuditPage() {
  const facilities = useApiData(() => listFacilities(), []);
  const [filters, setFilters] = useState({
    entityType: '', entityId: '', action: '', actorRole: '', facilityId: '', q: '', window: '7d',
  });
  const [importantOnly, setImportantOnly] = useState(true);
  const [entries, setEntries] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const appliedOpts = useCallback((beforeSeq) => ({
    entityType: filters.entityType || undefined,
    entityId: filters.entityId || undefined,
    action: filters.action || undefined,
    actorRole: filters.actorRole || undefined,
    facilityId: filters.facilityId || undefined,
    q: filters.q || undefined,
    window: filters.action || filters.q || filters.entityId ? undefined : (filters.window || undefined),
    important: importantOnly,
    limit: PAGE,
    beforeSeq,
  }), [filters, importantOnly]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const s = await getAuditSummary({
        window: filters.window || '7d',
        facilityId: filters.facilityId || undefined,
      });
      setSummary(s);
    } catch (err) {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.window, filters.facilityId]);

  const load = useCallback(async (beforeSeq) => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await listAudit(appliedOpts(beforeSeq));
      setEntries((prev) => {
        const page = data || [];
        if (!beforeSeq) return page;
        const seen = new Set(prev.map((e) => e.seq));
        return [...prev, ...page.filter((e) => !seen.has(e.seq))];
      });
      setNextBefore(meta?.next_before_seq ?? null);
    } catch (err) {
      setError(err);
      if (!beforeSeq) setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [appliedOpts]);

  useEffect(() => { load(); loadSummary(); }, [importantOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (e) => {
    e?.preventDefault?.();
    load();
    loadSummary();
  };

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const onExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await exportAuditCsv({ ...appliedOpts(), limit: 2000, beforeSeq: undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'caelum-audit.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        subtitle="Every change, newest first. Important events are shown by default."
        onRefresh={() => { load(); loadSummary(); }}
        loading={loading}
      >
        <Button variant="ghost" onClick={onExport} disabled={exporting}>
          <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </PageHeader>
      <ChainVerify />
      <SummaryStrip summary={summary} loading={summaryLoading} />
      <Card className="p-4 space-y-3">
        <form className="flex flex-wrap gap-2 items-end" onSubmit={apply}>
          <label className="text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200 pb-2">
            <input type="checkbox" checked={importantOnly} onChange={(e) => setImportantOnly(e.target.checked)} />
            Important only
          </label>
          <select aria-label="Window" className={`${inputClass} w-28`} value={filters.window} onChange={set('window')}>
            <option value="1d">Last day</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="">Any time</option>
          </select>
          <select aria-label="Facility" className={`${inputClass} w-56`} value={filters.facilityId} onChange={set('facilityId')}>
            <option value="">All facilities</option>
            {(facilities.data || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select aria-label="Actor role" className={`${inputClass} w-36`} value={filters.actorRole} onChange={set('actorRole')}>
            <option value="">Any actor</option>
            {['admin', 'facility', 'courier', 'system'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input aria-label="Action" placeholder="Action (e.g. offer.accepted)" className={`${inputClass} w-48`} value={filters.action} onChange={set('action')} />
          <input aria-label="Search" placeholder="Search…" className={`${inputClass} w-40`} value={filters.q} onChange={set('q')} />
          <Button type="submit">Filter</Button>
        </form>
        <ErrorNote error={error} onRetry={() => load()} />
        {loading && entries.length === 0 ? <Loading /> : (
          <AuditList
            entries={entries}
            empty={importantOnly ? 'No important events in this window. Turn off “Important only” to see everything.' : 'No audit entries.'}
          />
        )}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{entries.length} shown{nextBefore != null ? ' · more available' : ''}</span>
          <div className="flex items-center gap-2">
            {nextBefore != null && (
              <Button variant="ghost" disabled={loading} onClick={() => load(nextBefore)}>Load older</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
