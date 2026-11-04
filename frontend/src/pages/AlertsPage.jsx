import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { listAlerts } from '../lib/api/forecast';
import { useForecastRun } from '../hooks/useForecastRun';
import { runSweep } from '../lib/api/admin';
import { useApiData } from '../hooks/useApiData';
import { useFacilityNames } from '../hooks/useFacilityNames';
import { Button, Card, ErrorNote, PageHeader, Pill, Table } from '../components/ui';
import { formatTime, humanize } from '../lib/format';

export function forecastSummary(run) {
  const r = run?.result || {};
  return `Forecast finished: ${r.facilities ?? 0} facilities, ${r.series ?? 0} series, ${r.shortages ?? 0} shortages, `
    + `${r.alerts?.length ?? 0} alerts, ${r.suggested_requests?.length ?? 0} suggested requests.`;
}

function forecastStatus(run) {
  if (!run) return null;
  const p = run.progress || {};
  if (run.status === 'queued') return 'Forecast queued…';
  if (run.status === 'running') return `Forecast running: ${p.facilities_done ?? 0}/${p.facilities_total ?? '?'} facilities`;
  if (run.status === 'succeeded') return forecastSummary(run);
  return null;
}

export default function AlertsPage({ onForecastDone }) {
  const alerts = useApiData(listAlerts, [], { pollMs: 60000 });
  const name = useFacilityNames();
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const facilityLabel = (id) => name(id) === `${(id || '').slice(0, 8)}…` ? (id || 'Unknown facility') : name(id);
  const forecast = useForecastRun({ onSucceeded: (job) => { alerts.reload(); onForecastDone?.(job); } });

  const run = async (kind) => {
    setBusy(kind); setError(null); setResult(null);
    try {
      const r = await runSweep();
      setResult(`Sweep: ${r?.offers_expired ?? 0} offers expired, ${r?.transfers_lapsed ?? 0} transfers lapsed, ${r?.courier_assignments_timed_out ?? 0} courier assignments timed out.`);
      alerts.reload();
    } catch (err) { setError(err); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Shortage alerts" subtitle="Open alerts from the forecast (cover under 3 days; critical under 1)." onRefresh={alerts.reload} loading={alerts.loading}>
        <Button onClick={() => { setResult(null); forecast.start(); }} disabled={forecast.active}><Play className="w-3.5 h-3.5" /> Run forecast (all)</Button>
        <Button variant="ghost" onClick={() => run('sweep')} disabled={!!busy}>Run timeout sweep</Button>
      </PageHeader>
      {forecastStatus(forecast.run) && <Card role="status" className="p-3 text-xs text-slate-700 dark:text-slate-200">{forecastStatus(forecast.run)}</Card>}
      {forecast.run?.status === 'failed' && <ErrorNote error={{ code: 'forecast_failed', message: forecast.run.error || 'The forecast run failed.' }} />}
      {forecast.run?.status === 'succeeded' && (forecast.run.result?.errors || []).length > 0 && (
        <div role="alert" className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200 text-xs">
          <div className="font-bold">Some facilities failed in this run; the rest finished.</div>
          <ul className="mt-1 list-disc pl-4">
            {forecast.run.result.errors.map((e, i) => (
              <li key={e.facility_id || i}><span className="font-semibold">{facilityLabel(e.facility_id)}</span>{e.error ? `: ${e.error}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
      <ErrorNote error={forecast.error} />
      {result && <Card className="p-3 text-xs text-slate-700 dark:text-slate-200">{result}</Card>}
      <ErrorNote error={error || alerts.error} onRetry={alerts.reload} />
      <Card>
        <Table
          rows={alerts.data || []}
          empty="No open alerts."
          columns={[
            { key: 'facility', label: 'Facility', render: (a) => name(a.facility_id) },
            { key: 'group', label: 'Product', render: (a) => `${a.blood_group} ${humanize(a.product_type)}` },
            { key: 'units_remaining', label: 'Units' },
            { key: 'days_of_cover', label: 'Cover (days)', render: (a) => Number(a.days_of_cover).toFixed(1) },
            { key: 'depletion_at', label: 'Depletes', render: (a) => formatTime(a.depletion_at) },
            { key: 'urgency', label: 'Urgency', render: (a) => <Pill status={a.urgency} /> },
            { key: 'detected_at', label: 'Detected', render: (a) => formatTime(a.detected_at) },
          ]}
        />
      </Card>
    </div>
  );
}
