import React, { useMemo, useState } from 'react';
import { listInventory, correctInventoryUnit, listInventoryCorrections } from '../../lib/api/inventory';
import { useApiData } from '../../hooks/useApiData';
import { Button, ErrorNote, Loading, Pill, Table, inputClass } from '../ui';
import { formatDate, formatTemp, formatTime } from '../../lib/format';

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const UNIT_STATUSES = ['available', 'reserved', 'in_transit', 'transferred', 'expired', 'discarded'];
const LOCKED = ['reserved', 'in_transit', 'transferred'];

function CorrectionForm({ unit, onDone, onCancel }) {
  const [form, setForm] = useState({
    lot_number: unit.lot_number || '',
    expiry_date: (unit.expiry_date || '').slice(0, 10),
    storage_temp_c: unit.storage_temp_c ?? '',
    status: unit.status,
    reason: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const changes = {};
    if (form.lot_number !== (unit.lot_number || '')) changes.lot_number = form.lot_number;
    if (form.expiry_date && form.expiry_date !== (unit.expiry_date || '').slice(0, 10)) changes.expiry_date = `${form.expiry_date}T00:00:00Z`;
    const temp = form.storage_temp_c === '' ? null : Number(form.storage_temp_c);
    if (temp !== (unit.storage_temp_c ?? null)) changes.storage_temp_c = temp;
    if (form.status !== unit.status) changes.status = form.status;
    if (!Object.keys(changes).length) { onCancel(); return; }
    setBusy(true);
    setError(null);
    try {
      await correctInventoryUnit(unit.id, changes, form.reason);
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} aria-label={`Correct ${unit.unit_code}`} className="p-3 mt-2 rounded-xl bg-bg-inset dark:bg-slate-900/60 border border-border-warm dark:border-slate-700 grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
      <label>Lot<input className={inputClass} value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} /></label>
      <label>Expiry<input className={inputClass} type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></label>
      <label>Storage °C<input className={inputClass} type="number" step="0.1" min="-50" max="40" value={form.storage_temp_c} onChange={(e) => setForm({ ...form, storage_temp_c: e.target.value })} /></label>
      <label>Status
        <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {[unit.status, ...['available', 'discarded', 'expired'].filter((s) => s !== unit.status)].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="col-span-2 md:col-span-1">Reason<input className={inputClass} value={form.reason} placeholder="Required for lot, expiry or temp" onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
      <div className="col-span-2 md:col-span-5"><ErrorNote error={error} /></div>
      <div className="col-span-2 md:col-span-5 flex gap-2">
        <Button type="submit" disabled={busy}>Save correction</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/** Inventory for one facility, with corrections and the logged correction history. */
export default function InventoryPanel({ facilityId }) {
  const [filters, setFilters] = useState({ bloodGroup: '', status: '' });
  const [editing, setEditing] = useState(null);
  const inv = useApiData(() => listInventory({ facilityId, ...filters }), [facilityId, filters.bloodGroup, filters.status]);
  const corrections = useApiData(() => listInventoryCorrections({ limit: 200 }), [facilityId]);

  const unitIds = useMemo(() => new Set((inv.data || []).map((u) => u.id)), [inv.data]);
  const unitCode = useMemo(() => Object.fromEntries((inv.data || []).map((u) => [u.id, u.unit_code])), [inv.data]);
  const facilityCorrections = (corrections.data || []).filter((c) => unitIds.has(c.entity_id));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select aria-label="Blood group filter" className={`${inputClass} w-28`} value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
          <option value="">All groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select aria-label="Status filter" className={`${inputClass} w-36`} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {UNIT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <ErrorNote error={inv.error} onRetry={inv.reload} />
      {inv.loading && !inv.data ? <Loading /> : (
        <Table
          rows={inv.data || []}
          empty="No units match."
          columns={[
            { key: 'unit_code', label: 'Unit', render: (u) => <span className="font-mono">{u.unit_code}</span> },
            { key: 'blood_group', label: 'Group' },
            { key: 'product_type', label: 'Product' },
            { key: 'lot_number', label: 'Lot' },
            { key: 'expiry_date', label: 'Expiry', render: (u) => formatDate(u.expiry_date) },
            { key: 'storage_temp_c', label: 'Storage', render: (u) => formatTemp(u.storage_temp_c) },
            { key: 'status', label: 'Status', render: (u) => <Pill status={u.status} /> },
            {
              key: 'edit', label: '', render: (u) => (LOCKED.includes(u.status)
                ? <span className="text-[10px] text-slate-400">locked</span>
                : <Button variant="ghost" onClick={() => setEditing(u)}>Correct</Button>),
            },
          ]}
        />
      )}
      {editing && (
        <CorrectionForm
          key={editing.id}
          unit={editing}
          onCancel={() => setEditing(null)}
          onDone={() => { setEditing(null); inv.reload(); corrections.reload(); }}
        />
      )}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Logged corrections</div>
        <ErrorNote error={corrections.error} />
        {facilityCorrections.length === 0 ? <div className="text-xs text-slate-400">No corrections logged for these units.</div> : (
          <ul className="text-xs space-y-1">
            {facilityCorrections.map((c) => (
              <li key={c.seq} className="flex flex-wrap gap-2">
                <span className="text-slate-400">{formatTime(c.at)}</span>
                <span className="font-mono">{unitCode[c.entity_id]}</span>
                <span>“{c.payload?.reason}”</span>
                <span className="text-slate-500">{JSON.stringify(c.payload?.before)} → {JSON.stringify(c.payload?.after)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
