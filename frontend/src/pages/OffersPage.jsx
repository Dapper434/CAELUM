import React, { useState } from 'react';
import { listOffers, holdOffer, acceptOffer, declineOffer, offerActions, OFFER_STATUSES, DECLINE_REASONS } from '../lib/api/offers';
import { useApiData, useNow } from '../hooks/useApiData';
import { useFacilityNames } from '../hooks/useFacilityNames';
import { Button, Card, ErrorNote, PageHeader, Pill, Table, inputClass } from '../components/ui';
import { countdown, formatTime, humanize } from '../lib/format';

function OfferActions({ offer, onDone }) {
  const can = offerActions(offer);
  const [declining, setDeclining] = useState(false);
  const [code, setCode] = useState(DECLINE_REASONS[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const act = async (fn) => {
    setError(null);
    try { await fn(); setDeclining(false); onDone(); } catch (err) { setError(err); }
  };
  if (!can.hold && !can.accept && !can.decline) return null;
  return (
    <div className="space-y-1.5 min-w-[12rem]">
      <div className="flex gap-1.5 flex-wrap">
        {can.hold && <Button variant="ghost" onClick={() => act(() => holdOffer(offer.id))}>{offer.status === 'held' ? 'Extend hold' : 'Hold 30 min'}</Button>}
        {can.accept && <Button variant="success" onClick={() => act(() => acceptOffer(offer.id))}>Accept</Button>}
        {can.decline && <Button variant="danger" onClick={() => setDeclining((v) => !v)}>Decline</Button>}
      </div>
      {declining && (
        <div className="flex gap-1.5 flex-wrap">
          <select aria-label="Decline reason" className={`${inputClass} w-40`} value={code} onChange={(e) => setCode(e.target.value)}>
            {DECLINE_REASONS.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
          </select>
          <input aria-label="Decline note" className={`${inputClass} w-40`} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button variant="danger" onClick={() => act(() => declineOffer(offer.id, code, note || undefined))}>Send decline</Button>
        </div>
      )}
      <ErrorNote error={error} />
    </div>
  );
}

/** All donor offers, with the 5-min accept and 30-min hold timeouts counting down. */
export default function OffersPage() {
  const [status, setStatus] = useState('');
  const list = useApiData(() => listOffers({ status: status || undefined }), [status], { pollMs: 15000 });
  const name = useFacilityNames();
  const now = useNow(1000);

  return (
    <div className="space-y-4">
      <PageHeader title="Donor offers" subtitle="pending (5 min) → held (30 min, one extension) → accepted → packed. Expiry reopens the request." onRefresh={list.reload} loading={list.loading}>
        <select aria-label="Offer status" className={`${inputClass} w-36`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {OFFER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </PageHeader>
      <ErrorNote error={list.error} onRetry={list.reload} />
      <Card>
        <Table
          rows={list.data || []}
          empty="No offers."
          columns={[
            { key: 'offer_code', label: 'Offer', render: (o) => <span className="font-mono">{o.offer_code}</span> },
            { key: 'route', label: 'Donor → recipient', render: (o) => `${name(o.donor_facility_id)} → ${name(o.recipient_facility_id)}` },
            { key: 'need', label: 'Units', render: (o) => `${o.units_requested} × ${o.blood_group}` },
            { key: 'eta', label: 'ETA', render: (o) => `${o.eta_minutes} min${o.eta_source === 'estimate' ? ' (estimate)' : ''}` },
            { key: 'status', label: 'Status', render: (o) => <Pill status={o.status} /> },
            {
              key: 'expires_at', label: 'Time left', render: (o) => (['pending', 'held'].includes(o.status)
                ? <span className="font-mono font-bold">{countdown(o.expires_at, now)}</span>
                : formatTime(o.responded_at || o.updated_at)),
            },
            { key: 'actions', label: '', render: (o) => <OfferActions offer={o} onDone={list.reload} /> },
          ]}
        />
      </Card>
    </div>
  );
}
