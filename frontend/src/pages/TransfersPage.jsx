import React, { useState } from 'react';
import { listTransfers, getTransfer, assignCourier, cancelTransfer, getTransferAudit, transferActions, transferDeadline, TRANSFER_STAGES } from '../lib/api/transfers';
import { listCouriers } from '../lib/api/couriers';
import { useApiData, useNow } from '../hooks/useApiData';
import { useFacilityNames } from '../hooks/useFacilityNames';
import { Button, Card, ErrorNote, Field, Loading, PageHeader, Pill, Table, inputClass } from '../components/ui';
import StageTimeline from '../components/transfer/StageTimeline';
import CustodyPanel from '../components/transfer/CustodyPanel';
import ColdChainPanel from '../components/transfer/ColdChainPanel';
import TrackingPanel from '../components/transfer/TrackingPanel';
import AuditList from '../components/AuditList';
import { countdown, formatDate, formatTemp, formatTime, humanize } from '../lib/format';

const TABS = ['custody', 'cold chain', 'tracking', 'audit'];

function AssignCourier({ transfer, onDone }) {
  const couriers = useApiData(() => listCouriers('available'), []);
  const [courierId, setCourierId] = useState('');
  const [error, setError] = useState(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Courier to assign" className={`${inputClass} w-56`} value={courierId} onChange={(e) => setCourierId(e.target.value)}>
        <option value="">Pick an available courier</option>
        {(couriers.data || []).map((c) => <option key={c.id} value={c.id}>{c.full_name} · {c.vehicle_type} · {c.cold_box_id || 'no cold box'}</option>)}
      </select>
      <Button disabled={!courierId} onClick={async () => {
        setError(null);
        try { await assignCourier(transfer.id, courierId); onDone(); } catch (err) { setError(err); }
      }}>Assign courier</Button>
      <ErrorNote error={error || couriers.error} />
    </div>
  );
}

function CancelTransfer({ transfer, onDone }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label="Cancel reason" className={`${inputClass} w-56`} placeholder="Cancel reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button variant="danger" onClick={async () => {
        setError(null);
        try { await cancelTransfer(transfer.id, reason || undefined); onDone(); } catch (err) { setError(err); }
      }}>Cancel transfer</Button>
      <ErrorNote error={error} />
    </div>
  );
}

function TransferDetail({ id, name, onChanged }) {
  const now = useNow(1000);
  const [tab, setTab] = useState('custody');
  const { data: t, error, loading, reload } = useApiData(() => getTransfer(id), [id], { pollMs: 20000 });
  const audit = useApiData(() => getTransferAudit(id), [id, t?.updated_at], { enabled: tab === 'audit' });
  if (loading && !t) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!t) return null;
  const can = transferActions(t);
  const deadline = transferDeadline(t);
  const refresh = () => { reload(); onChanged(); };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-slate-100 font-mono">{t.transfer_code}</h2>
          <div className="text-xs text-slate-500">Manifest {t.manifest_code} · {name(t.donor_facility_id)} → {name(t.recipient_facility_id)}</div>
        </div>
        <Pill status={t.stage} />
      </div>
      <StageTimeline transfer={t} />
      {deadline && (
        <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          {deadline.label} {formatTime(deadline.at)} · <span className="font-mono">{countdown(deadline.at, now)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Units">{t.quantity} × {t.blood_group} {humanize(t.product_type)}</Field>
        <Field label="Distance / transit">{t.distance_km} km · {t.transit_minutes} min{t.eta_source === 'estimate' ? ' (estimate)' : ''}</Field>
        <Field label="Courier">{t.courier_id ? `${t.courier_id.slice(0, 8)}…${t.courier_accepted_at ? ' (accepted)' : ' (awaiting accept)'}` : '—'}</Field>
        <Field label="Temperature"><span className={t.temperature_excursion ? 'text-status-crimson font-bold' : ''}>{formatTemp(t.temperature_c)}</span></Field>
        <Field label="Picked up">{formatTime(t.picked_up_at)}</Field>
        <Field label="Delivered">{formatTime(t.delivered_at)}</Field>
        <Field label="Receipt">{t.receipt_condition ? `${humanize(t.receipt_condition)} · ${t.receiver_name || ''}` : '—'}</Field>
        <Field label="Courier decline">{t.courier_decline_reason ? `${humanize(t.courier_decline_reason)} ${t.courier_decline_note || ''}` : '—'}</Field>
      </div>
      {t.units?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.units.map((u) => <span key={u.id} className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-bg-inset dark:bg-slate-900 border border-border-warm dark:border-slate-700">{u.unit_code} · exp {formatDate(u.expiry_date)} · {u.status}</span>)}
        </div>
      )}
      {can.assignCourier && <AssignCourier transfer={t} onDone={refresh} />}
      {can.cancel && <CancelTransfer transfer={t} onDone={refresh} />}

      <div role="tablist" className="flex gap-1.5 flex-wrap">
        {TABS.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${tab === x ? 'bg-brand-cobalt text-white border-brand-cobalt' : 'bg-bg-inset dark:bg-slate-800/60 border-border-warm dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>{x}</button>
        ))}
      </div>
      {tab === 'custody' && <CustodyPanel transfer={t} />}
      {tab === 'cold chain' && <ColdChainPanel transfer={t} />}
      {tab === 'tracking' && <TrackingPanel transfer={t} />}
      {tab === 'audit' && (<><ErrorNote error={audit.error} /><AuditList entries={audit.data || []} /></>)}
    </Card>
  );
}

export default function TransfersPage() {
  const [stage, setStage] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const list = useApiData(() => listTransfers({ stage: stage || undefined, active: activeOnly && !stage }), [stage, activeOnly], { pollMs: 20000 });
  const name = useFacilityNames();
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-4">
      <PageHeader title="Transfers" subtitle="Pack within 30 min of accept; couriers have 5 min to accept a job. Admins can cancel any time before delivery." onRefresh={list.reload} loading={list.loading}>
        <label className="text-xs flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Active only
        </label>
        <select aria-label="Transfer stage" className={`${inputClass} w-40`} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {TRANSFER_STAGES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </PageHeader>
      <ErrorNote error={list.error} onRetry={list.reload} />
      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <Card>
          <Table
            rows={list.data || []}
            empty="No transfers."
            onRowClick={(t) => setSelected(t.id)}
            columns={[
              { key: 'transfer_code', label: 'Transfer', render: (t) => <span className="font-mono">{t.transfer_code}</span> },
              { key: 'route', label: 'Route', render: (t) => `${name(t.donor_facility_id)} → ${name(t.recipient_facility_id)}` },
              { key: 'units', label: 'Units', render: (t) => `${t.quantity} × ${t.blood_group}` },
              { key: 'stage', label: 'Stage', render: (t) => <Pill status={t.stage} /> },
              { key: 'temp', label: 'Temp', render: (t) => <span className={t.temperature_excursion ? 'text-status-crimson font-bold' : ''}>{formatTemp(t.temperature_c)}</span> },
            ]}
          />
        </Card>
        <div>{selected ? <TransferDetail id={selected} name={name} onChanged={list.reload} /> : <Card className="p-6 text-xs text-center text-slate-500">Select a transfer.</Card>}</div>
      </div>
    </div>
  );
}
