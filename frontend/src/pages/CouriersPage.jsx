import React, { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { listCouriers, createCourier, updateCourier, listCourierLocations, licenceExpired } from '../lib/api/couriers';
import { listTransfers } from '../lib/api/transfers';
import { useApiData } from '../hooks/useApiData';
import { useFacilityNames } from '../hooks/useFacilityNames';
import { Button, Card, ErrorNote, Field, Loading, PageHeader, Pill, Table, inputClass } from '../components/ui';
import CourierForm from '../components/CourierForm';
import LeafletMap from '../components/LeafletMap';
import { formatDate, formatTime, humanize } from '../lib/format';

function CourierDetail({ courier, onChanged }) {
  const [editing, setEditing] = useState(false);
  const name = useFacilityNames();
  const locations = useApiData(() => listCourierLocations(courier.id, 100), [courier.id]);
  // The API has no admin job-history endpoint per courier; we filter the full transfer list (see docs/CONTRACT_GAPS.md).
  const transfers = useApiData(() => listTransfers(), [courier.id]);
  const jobs = useMemo(() => (transfers.data || []).filter((t) => t.courier_id === courier.id), [transfers.data, courier.id]);
  const path = (locations.data || []).slice().reverse().map((l) => [l.longitude, l.latitude]);
  const latest = locations.data?.[0];
  const markers = latest ? [{ id: 'latest', lat: latest.latitude, lng: latest.longitude, kind: courier.status, label: `${courier.full_name} · ${formatTime(latest.recorded_at)}` }] : [];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-slate-100">{courier.full_name}</h2>
          <div className="text-xs text-slate-500">{courier.vehicle_type} {courier.vehicle_plate || ''} · {courier.phone || 'no phone'}</div>
        </div>
        <div className="flex gap-1.5"><Pill status={courier.status} />{!courier.is_active && <Pill tone="red">Inactive</Pill>}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Licence">{courier.licence_number}</Field>
        <Field label="Class">{courier.licence_class}</Field>
        <Field label="Expiry"><span className={licenceExpired(courier.licence_expiry) ? 'text-status-crimson font-bold' : ''}>{formatDate(courier.licence_expiry)}{licenceExpired(courier.licence_expiry) ? ' (expired)' : ''}</span></Field>
        <Field label="Certified">{courier.training_certified ? `Yes ${courier.certified_at ? formatDate(courier.certified_at) : ''}` : 'No'}</Field>
        <Field label="Cold box">{courier.cold_box_id}</Field>
        <Field label="Region">{courier.region_code}</Field>
        <Field label="Completed jobs">{courier.completed_jobs}</Field>
        <Field label="Last seen">{formatTime(courier.last_seen_at)}</Field>
      </div>
      {editing ? (
        <CourierForm courier={courier} submitLabel="Save profile" onSubmit={async (body) => { await updateCourier(courier.id, body); setEditing(false); onChanged(); }} />
      ) : <Button variant="ghost" onClick={() => setEditing(true)}>Edit profile</Button>}

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Recent positions</div>
        <ErrorNote error={locations.error} />
        <LeafletMap height={240} markers={markers} routes={path.length > 1 ? [{ id: 'trail', coordinates: path }] : []} />
        <Table
          rows={(locations.data || []).slice(0, 10)}
          empty="No pings yet."
          columns={[
            { key: 'recorded_at', label: 'Recorded', render: (l) => formatTime(l.recorded_at) },
            { key: 'pos', label: 'Position', render: (l) => `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}` },
            { key: 'speed_kmh', label: 'km/h' },
            { key: 'battery_pct', label: 'Battery', render: (l) => (l.battery_pct != null ? `${l.battery_pct}%` : '—') },
            { key: 'late', label: '', render: (l) => (l.late ? <Pill status="late">Late</Pill> : null) },
          ]}
        />
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Job history</div>
        <ErrorNote error={transfers.error} />
        <Table
          rows={jobs}
          empty="No jobs yet."
          columns={[
            { key: 'transfer_code', label: 'Transfer', render: (t) => <span className="font-mono">{t.transfer_code}</span> },
            { key: 'route', label: 'Route', render: (t) => `${name(t.donor_facility_id)} → ${name(t.recipient_facility_id)}` },
            { key: 'stage', label: 'Stage', render: (t) => <Pill status={t.stage} /> },
            { key: 'delivered_at', label: 'Delivered', render: (t) => formatTime(t.delivered_at) },
            { key: 'decline', label: 'Declined', render: (t) => (t.last_declined_courier_id === courier.id ? humanize(t.courier_decline_reason) : '—') },
          ]}
        />
      </div>
    </Card>
  );
}

export default function CouriersPage() {
  const [status, setStatus] = useState('');
  const list = useApiData(() => listCouriers(status || undefined), [status], { pollMs: 30000 });
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const courier = (list.data || []).find((c) => c.id === selected);

  return (
    <div className="space-y-4">
      <PageHeader title="Couriers" subtitle="Rider profiles, licences, positions and jobs." onRefresh={list.reload} loading={list.loading}>
        <select aria-label="Courier status" className={`${inputClass} w-32`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>{['available', 'on_job', 'offline'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
        <Button onClick={() => setCreating((v) => !v)}><UserPlus className="w-3.5 h-3.5" /> New courier</Button>
      </PageHeader>
      <ErrorNote error={list.error} onRetry={list.reload} />
      {creating && (
        <Card className="p-4">
          <CourierForm submitLabel="Create courier" onSubmit={async (body) => { const c = await createCourier(body); setCreating(false); await list.reload(); setSelected(c?.id || null); }} />
        </Card>
      )}
      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <Card>
          {list.loading && !list.data ? <Loading /> : (
            <Table
              rows={list.data || []}
              empty="No couriers."
              onRowClick={(c) => setSelected(c.id)}
              columns={[
                { key: 'full_name', label: 'Courier' },
                { key: 'vehicle_type', label: 'Vehicle' },
                { key: 'status', label: 'Status', render: (c) => <Pill status={c.status} /> },
                { key: 'licence', label: 'Licence', render: (c) => (licenceExpired(c.licence_expiry) ? <Pill tone="red">Expired</Pill> : c.licence_class || '—') },
                { key: 'last_seen_at', label: 'Seen', render: (c) => formatTime(c.last_seen_at) },
              ]}
            />
          )}
        </Card>
        <div>{courier ? <CourierDetail key={courier.id} courier={courier} onChanged={list.reload} /> : <Card className="p-6 text-xs text-center text-slate-500">Select a courier.</Card>}</div>
      </div>
    </div>
  );
}
