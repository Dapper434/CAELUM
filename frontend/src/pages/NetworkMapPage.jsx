import React, { useMemo } from 'react';
import { getNetworkMap } from '../lib/api/admin';
import { useApiData } from '../hooks/useApiData';
import { Card, ErrorNote, PageHeader, Pill, Table } from '../components/ui';
import LeafletMap from '../components/LeafletMap';
import { formatTime, formatTemp } from '../lib/format';

/** Live map: facilities with stock, active transfer routes and each courier's latest position. */
export default function NetworkMapPage() {
  const { data, error, loading, reload } = useApiData(getNetworkMap, [], { pollMs: 15000 });
  const facilities = data?.facilities || [];
  const couriers = data?.couriers || [];
  const transfers = data?.transfers || [];

  const markers = useMemo(() => [
    ...facilities.map((f) => ({
      id: `f-${f.id}`, lat: f.latitude, lng: f.longitude, kind: f.open_alerts ? 'alert' : 'facility',
      label: `${f.name} · ${Object.entries(f.stock || {}).map(([g, n]) => `${g} ${n}`).join(', ') || 'no stock'}`,
    })),
    ...couriers.map((c) => ({
      id: `c-${c.id}`, lat: c.latitude, lng: c.longitude, kind: c.status,
      label: `${c.full_name} (${c.status}) · seen ${formatTime(c.last_seen_at)}`,
    })),
  ], [facilities, couriers]);

  const routes = useMemo(() => transfers.map((t) => ({
    id: t.id, coordinates: t.route_geojson?.coordinates, excursion: t.temperature_excursion, label: `${t.transfer_code} · ${t.stage}`,
  })), [transfers]);

  return (
    <div className="space-y-4">
      <PageHeader title="Live map" subtitle="Refreshes every 15 s. Couriers show their latest reported position." onRefresh={reload} loading={loading} />
      <ErrorNote error={error} onRetry={reload} />
      <Card className="p-3"><LeafletMap markers={markers} routes={routes} /></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="px-4 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Couriers ({couriers.length})</div>
          <Table
            rows={couriers}
            empty="No couriers yet."
            columns={[
              { key: 'full_name', label: 'Courier' },
              { key: 'status', label: 'Status', render: (c) => <Pill status={c.status} /> },
              { key: 'pos', label: 'Last position', render: (c) => (c.latitude != null ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : '—') },
              { key: 'last_seen_at', label: 'Seen', render: (c) => formatTime(c.last_seen_at) },
            ]}
          />
        </Card>
        <Card>
          <div className="px-4 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Transfers on the map ({transfers.length})</div>
          <Table
            rows={transfers}
            empty="No active transfers."
            columns={[
              { key: 'transfer_code', label: 'Transfer' },
              { key: 'stage', label: 'Stage', render: (t) => <Pill status={t.stage} /> },
              { key: 'temperature_c', label: 'Temp', render: (t) => <span className={t.temperature_excursion ? 'text-status-crimson font-bold' : ''}>{formatTemp(t.temperature_c)}</span> },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
