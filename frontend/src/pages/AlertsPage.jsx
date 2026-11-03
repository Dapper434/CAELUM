import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { listAlerts, runForecast } from '../lib/api/forecast';
import { runSweep } from '../lib/api/admin';
import { useApiData } from '../hooks/useApiData';
import { useFacilityNames } from '../hooks/useFacilityNames';
import { Button, Card, ErrorNote, PageHeader, Pill, Table } from '../components/ui';
import { formatTime, humanize } from '../lib/format';

export default function AlertsPage() {
  const alerts = useApiData(listAlerts, [], { pollMs: 60000 });
  const name = useFacilityNames();
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async (kind) => {
    setBusy(kind); setError(null); setResult(null);
    try {
      if (kind === 'forecast') {
        const r = await runForecast();
        setResult(`Forecast run: ${r?.alerts?.length ?? 0} alerts, ${r?.suggested_requests?.length ?? 0} suggested requests.`);
      } else {
        const r = await runSweep();
        setResult(`Sweep: ${r?.offers_expired ?? 0} offers expired, ${r?.transfers_lapsed ?? 0} transfers lapsed, ${r?.courier_assignments_timed_out ?? 0} courier assignments timed out.`);
      }
      alerts.reload();
    } catch (err) { setError(err); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Shortage alerts" subtitle="Open alerts from the forecast (cover under 3 days; critical under 1)." onRefresh={alerts.reload} loading={alerts.loading}>
        <Button onClick={() => run('forecast')} disabled={!!busy}><Play className="w-3.5 h-3.5" /> Run forecast (all)</Button>
        <Button variant="ghost" onClick={() => run('sweep')} disabled={!!busy}>Run timeout sweep</Button>
      </PageHeader>
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
