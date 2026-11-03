import React, { useState } from 'react';
import { listRequests, getRequest, confirmRequest, dismissRequest, cancelRequest, getCandidates, createOffer, requestActions, REQUEST_STATUSES } from '../lib/api/requests';
import { listOffers } from '../lib/api/offers';
import { useApiData } from '../hooks/useApiData';
import { useFacilityNames } from '../hooks/useFacilityNames';
import { Button, Card, ErrorNote, Field, Loading, PageHeader, Pill, Table, inputClass } from '../components/ui';
import { formatTime, humanize } from '../lib/format';

function Candidates({ request, onOffered }) {
  const { data, error, loading, reload } = useApiData(() => getCandidates(request.id), [request.id]);
  const [actionError, setActionError] = useState(null);
  if (loading && !data) return <Loading label="Ranking donors…" />;
  return (
    <div className="space-y-2">
      <ErrorNote error={error} onRetry={reload} />
      <ErrorNote error={actionError} />
      {data?.rationale?.text && (
        <p className="text-xs text-slate-600 dark:text-slate-300 bg-bg-inset dark:bg-slate-900/50 rounded-lg p-2">
          {data.rationale.text} <span className="text-slate-400">({data.rationale.source}{data.rationale.llm_used ? ', LLM' : ''})</span>
        </p>
      )}
      <Table
        rows={data?.candidates || []}
        rowKey="donor_facility_id"
        empty="No eligible donor right now."
        columns={[
          { key: 'rank', label: '#' },
          { key: 'donor_name', label: 'Donor' },
          { key: 'eta', label: 'ETA', render: (c) => `${c.elapsed_minutes} min${c.eta_source === 'estimate' ? ' (estimate)' : ''}` },
          { key: 'distance_km', label: 'km' },
          { key: 'cover', label: 'Cover after', render: (c) => `${c.post_transfer_cover_days} d` },
          { key: 'units', label: 'Units', render: (c) => c.units?.map((u) => u.unit_code).join(', ') },
          {
            key: 'go', label: '', render: (c) => (
              <Button variant="success" onClick={async () => {
                setActionError(null);
                try { await createOffer(request.id, c.donor_facility_id); onOffered(); } catch (err) { setActionError(err); }
              }}>Offer</Button>
            ),
          },
        ]}
      />
      {data?.policies?.length > 0 && (
        <div className="text-[11px] text-slate-500">Policies: {data.policies.map((p) => `${p.title} ${p.section_ref || ''}`).join(' · ')}</div>
      )}
    </div>
  );
}

function RequestDetail({ id, name, onChanged }) {
  const req = useApiData(() => getRequest(id), [id]);
  const offers = useApiData(() => listOffers({ requestId: id }), [id]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const r = req.data;
  if (req.loading && !r) return <Loading />;
  if (req.error) return <ErrorNote error={req.error} onRetry={req.reload} />;
  if (!r) return null;
  const can = requestActions(r.status);

  const act = async (fn) => {
    setError(null);
    try { await fn(); req.reload(); offers.reload(); onChanged(); } catch (err) { setError(err); }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-slate-900 dark:text-slate-100">{r.request_code}</h2>
        <Pill status={r.status} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Recipient">{name(r.recipient_facility_id)}</Field>
        <Field label="Need">{r.units_requested} × {r.blood_group} {humanize(r.product_type)}</Field>
        <Field label="Urgency"><Pill status={r.urgency} /></Field>
        <Field label="Source">{r.source}</Field>
        <Field label="Reason">{r.reason}</Field>
        <Field label="Needed by">{formatTime(r.needed_by)}</Field>
        <Field label="Created">{formatTime(r.created_at)}</Field>
        <Field label="Cancel reason">{r.cancel_reason}</Field>
        {r.forecast_snapshot && <Field label="Forecast">{r.forecast_snapshot.days_of_cover} days cover · {r.forecast_snapshot.units_on_hand} on hand</Field>}
      </div>
      <ErrorNote error={error} />
      {(can.confirm || can.dismiss || can.cancel) && (
        <div className="flex flex-wrap gap-2 items-center">
          <input className={`${inputClass} w-56`} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {can.confirm && <Button variant="success" onClick={() => act(() => confirmRequest(r.id, reason ? { reason } : {}))}>Confirm</Button>}
          {can.dismiss && <Button variant="ghost" onClick={() => act(() => dismissRequest(r.id, reason))}>Dismiss</Button>}
          {can.cancel && <Button variant="danger" onClick={() => act(() => cancelRequest(r.id, reason))}>Cancel request</Button>}
        </div>
      )}
      {can.offer && (
        showCandidates
          ? <Candidates request={r} onOffered={() => { setShowCandidates(false); req.reload(); offers.reload(); onChanged(); }} />
          : <Button onClick={() => setShowCandidates(true)}>Find donors</Button>
      )}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Offers on this request</div>
        <Table
          rows={offers.data || []}
          empty="No offers yet."
          columns={[
            { key: 'offer_code', label: 'Offer' },
            { key: 'donor', label: 'Donor', render: (o) => name(o.donor_facility_id) },
            { key: 'status', label: 'Status', render: (o) => <Pill status={o.status} /> },
            { key: 'expires_at', label: 'Expires', render: (o) => formatTime(o.expires_at) },
            { key: 'decline_reason', label: 'Decline', render: (o) => humanize(o.decline_reason) },
          ]}
        />
      </div>
    </Card>
  );
}

export default function RequestsPage() {
  const [status, setStatus] = useState('');
  const list = useApiData(() => listRequests(status || undefined), [status], { pollMs: 20000 });
  const name = useFacilityNames();
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-4">
      <PageHeader title="Blood requests" subtitle="suggested → open → offered → matched → fulfilled. Forecast suggestions need confirming." onRefresh={list.reload} loading={list.loading}>
        <select aria-label="Request status" className={`${inputClass} w-36`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </PageHeader>
      <ErrorNote error={list.error} onRetry={list.reload} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <Table
            rows={list.data || []}
            empty="No requests."
            onRowClick={(r) => setSelected(r.id)}
            columns={[
              { key: 'request_code', label: 'Request', render: (r) => <span className="font-mono">{r.request_code}</span> },
              { key: 'recipient', label: 'Recipient', render: (r) => name(r.recipient_facility_id) },
              { key: 'need', label: 'Need', render: (r) => `${r.units_requested} × ${r.blood_group}` },
              { key: 'urgency', label: 'Urgency', render: (r) => <Pill status={r.urgency} /> },
              { key: 'status', label: 'Status', render: (r) => <Pill status={r.status} /> },
            ]}
          />
        </Card>
        <div>{selected ? <RequestDetail id={selected} name={name} onChanged={list.reload} /> : <Card className="p-6 text-xs text-center text-slate-500">Select a request.</Card>}</div>
      </div>
    </div>
  );
}
