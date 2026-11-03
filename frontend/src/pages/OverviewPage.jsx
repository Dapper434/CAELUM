import React, { useState } from 'react';
import { Activity, ShieldCheck, ShieldAlert, Thermometer, Truck, Users, Droplet, AlertTriangle, Timer } from 'lucide-react';
import { getOverview, getFeed, runSweep } from '../lib/api/admin';
import { useApiData } from '../hooks/useApiData';
import { Button, Card, ErrorNote, Loading, PageHeader, Pill } from '../components/ui';
import { formatTime, humanize, shortHash } from '../lib/format';

function Kpi({ label, value, icon: Icon, tone = 'text-slate-900 dark:text-slate-100', note }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      <div className={`text-2xl font-extrabold mt-1 ${tone}`}>{value ?? 0}</div>
      {note && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{note}</div>}
    </Card>
  );
}

function CountList({ title, counts }) {
  const entries = Object.entries(counts || {});
  return (
    <Card className="p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</div>
      {entries.length === 0 ? <div className="text-xs text-slate-400">None</div> : (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([status, n]) => <Pill key={status} status={status}>{humanize(status)} · {n}</Pill>)}
        </div>
      )}
    </Card>
  );
}

export default function OverviewPage() {
  const overview = useApiData(getOverview, [], { pollMs: 30000 });
  const feed = useApiData(() => getFeed(0, 15), [], { pollMs: 15000 });
  const [sweep, setSweep] = useState(null);
  const [sweepError, setSweepError] = useState(null);
  const o = overview.data;

  const onSweep = async () => {
    setSweepError(null);
    try {
      setSweep(await runSweep());
      overview.reload();
    } catch (err) {
      setSweepError(err);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Network overview"
        subtitle={o ? `Updated ${formatTime(o.generated_at)}` : 'Live counts across every facility'}
        onRefresh={overview.reload}
        loading={overview.loading}
      >
        <Button variant="ghost" onClick={onSweep}><Timer className="w-3.5 h-3.5" /> Run timeout sweep</Button>
      </PageHeader>

      <ErrorNote error={overview.error} onRetry={overview.reload} />
      <ErrorNote error={sweepError} />
      {sweep && (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          Sweep: {sweep.offers_expired} offers expired, {sweep.transfers_lapsed} transfers lapsed, {sweep.courier_assignments_timed_out} courier assignments timed out.
        </div>
      )}

      {!o && overview.loading && <Loading />}
      {o && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Kpi label="Active transfers" value={o.active_transfers} icon={Truck} tone="text-brand-cobalt dark:text-blue-400" />
            <Kpi label="Delivered (24 h)" value={o.delivered_24h} icon={Activity} tone="text-status-emerald" />
            <Kpi label="Open shortage alerts" value={o.open_alerts} icon={AlertTriangle} tone={o.open_alerts ? 'text-status-crimson' : undefined} />
            <Kpi label="Units available" value={o.inventory_available} icon={Droplet} />
            <Kpi label="Temp excursions (24 h)" value={o.temperature_excursions_24h} icon={Thermometer} tone={o.temperature_excursions_24h ? 'text-status-crimson' : undefined} />
            <Kpi label="Couriers available" value={o.couriers?.available} icon={Users} note={`${o.couriers?.on_job ?? 0} on a job · ${o.couriers?.offline ?? 0} offline`} />
            <Card className="p-4 col-span-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {o.audit?.valid ? <ShieldCheck className="w-4 h-4 text-status-emerald" /> : <ShieldAlert className="w-4 h-4 text-status-crimson" />}
                Audit chain
              </div>
              <div className={`text-sm font-extrabold mt-1 ${o.audit?.valid ? 'text-status-emerald' : 'text-status-crimson'}`}>
                {o.audit?.valid ? 'Intact' : `Broken at seq ${o.audit?.broken_at_seq}`}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">{o.audit?.length ?? 0} entries · head {shortHash(o.audit?.head_hash, 16)}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <CountList title="Requests" counts={o.requests} />
            <CountList title="Offers" counts={o.offers} />
            <CountList title="Transfers" counts={o.transfers} />
          </div>
        </>
      )}

      <Card className="p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Latest activity</div>
        <ErrorNote error={feed.error} />
        <ul className="divide-y divide-border-warm dark:divide-slate-700">
          {(feed.data || []).map((e) => (
            <li key={e.id || e.seq} className="py-1.5 flex items-center gap-3 text-xs">
              <span className="font-mono text-slate-400 w-12">#{e.seq}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{e.action}</span>
              <span className="text-slate-500">{e.actor_role}</span>
              <span className="ml-auto text-slate-400">{formatTime(e.at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
