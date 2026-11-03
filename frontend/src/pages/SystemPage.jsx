import React from 'react';
import { getHealth, getRootHealth } from '../lib/api/system';
import { getColdChainBands } from '../lib/api/admin';
import { listCourierDeclineReasons } from '../lib/api/couriers';
import { DECLINE_REASONS } from '../lib/api/offers';
import { useApiData } from '../hooks/useApiData';
import { useAuth } from '../auth/AuthContext';
import { readConfig } from '../lib/config';
import { Card, ErrorNote, Field, PageHeader, Pill } from '../components/ui';
import { formatTime, humanize } from '../lib/format';

function Section({ title, children }) {
  return <Card className="p-4 space-y-3"><h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>{children}</Card>;
}

export default function SystemPage() {
  const root = useApiData(getRootHealth, [], { pollMs: 60000 });
  const v1 = useApiData(getHealth, [], { pollMs: 60000 });
  const bands = useApiData(getColdChainBands, []);
  const reasons = useApiData(listCourierDeclineReasons, []);
  const { me, mode } = useAuth();
  const cfg = readConfig();

  return (
    <div className="space-y-4">
      <PageHeader title="System" subtitle="API health, version and reference data." onRefresh={() => { root.reload(); v1.reload(); }} loading={root.loading || v1.loading} />
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="API">
          <ErrorNote error={root.error || v1.error} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base URL"><span className="font-mono">{cfg.apiBaseUrl || 'not configured'}</span></Field>
            <Field label="Status">{v1.data ? <Pill status={v1.data.status === 'ok' ? 'ok' : 'error'}>{v1.data.status}</Pill> : '—'}</Field>
            <Field label="Service">{root.data?.service}</Field>
            <Field label="Version">{v1.data?.version || root.data?.version}</Field>
            <Field label="Store">{v1.data?.store}</Field>
            <Field label="Server time">{formatTime(v1.data?.time)}</Field>
          </div>
        </Section>
        <Section title="Signed in">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">{me?.email}</Field>
            <Field label="Role">{me?.role}</Field>
            <Field label="Mode">{mode === 'demo' ? 'Demo' : 'Supabase'}</Field>
            <Field label="User id"><span className="font-mono">{me?.user_id}</span></Field>
          </div>
        </Section>
        <Section title="Cold-chain bands">
          <ErrorNote error={bands.error} />
          <pre className="bg-bg-inset dark:bg-slate-900 rounded-lg p-2 overflow-x-auto text-[11px]">{bands.data ? JSON.stringify(bands.data, null, 2) : '—'}</pre>
        </Section>
        <Section title="Decline reasons">
          <ErrorNote error={reasons.error} />
          <div className="text-[11px] font-bold uppercase text-slate-400">Courier</div>
          <ul className="text-xs space-y-0.5">{(reasons.data || []).map((r) => <li key={r.code}><span className="font-mono">{r.code}</span> — {r.label}</li>)}</ul>
          <div className="text-[11px] font-bold uppercase text-slate-400">Donor offer</div>
          <ul className="text-xs space-y-0.5">{DECLINE_REASONS.map((r) => <li key={r}><span className="font-mono">{r}</span> — {humanize(r)}</li>)}</ul>
        </Section>
      </div>
    </div>
  );
}
