import React, { useState } from 'react';
import { QrCode, Lock, Image as ImageIcon, RotateCw } from 'lucide-react';
import { listCustodyEvents, getQrStatus, getPhotoUrl, checkSeal } from '../../lib/api/custody';
import { useApiData, useNow } from '../../hooks/useApiData';
import { Button, ErrorNote, Field, Pill, Table, inputClass } from '../ui';
import { countdown, formatTime, humanize } from '../../lib/format';

const QR_STAGES = ['packed', 'courier_assigned'];

function PhotoLink({ transferId, event }) {
  const [link, setLink] = useState(null);
  const [error, setError] = useState(null);
  if (!event.photo_path && !event.photo_url) return '—';
  if (!event.photo_path) return <span className="text-[11px] text-slate-500 break-all">{event.photo_url}</span>;
  return (
    <span>
      {link ? (
        <a href={link.url} target="_blank" rel="noreferrer noopener" className="text-brand-cobalt underline text-[11px]">
          Open photo (link expires {formatTime(link.expires_at, { withDate: false })})
        </a>
      ) : (
        <Button variant="ghost" onClick={async () => {
          setError(null);
          try { setLink(await getPhotoUrl(transferId, event.id, 300)); } catch (err) { setError(err); }
        }}><ImageIcon className="w-3 h-3" /> Get signed link</Button>
      )}
      {error && <span className="text-[11px] text-red-600 block">{error.message}</span>}
    </span>
  );
}

/** QR status and expiry, seal, custody events and signed photo links for one transfer. */
export default function CustodyPanel({ transfer }) {
  const now = useNow(1000);
  const events = useApiData(() => listCustodyEvents(transfer.id), [transfer.id, transfer.updated_at]);
  const showQr = QR_STAGES.includes(transfer.stage);
  const qr = useApiData(() => getQrStatus(transfer.id), [transfer.id, transfer.stage], { enabled: showQr });
  const [qrError, setQrError] = useState(null);
  const [seal, setSeal] = useState('');
  const [sealResult, setSealResult] = useState(null);
  const [sealError, setSealError] = useState(null);
  const canCheckSeal = ['in_transit', 'arrived', 'delivered'].includes(transfer.stage);

  const reissue = async () => {
    setQrError(null);
    try { qr.setData(await getQrStatus(transfer.id, { refresh: true })); events.reload(); } catch (err) { setQrError(err); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Seal"><span className="font-mono"><Lock className="w-3 h-3 inline mr-1" />{transfer.seal_number || '—'}</span></Field>
        <Field label="Cooler">{transfer.cooler_id}</Field>
        <Field label="Packed">{formatTime(transfer.packed_at)}</Field>
        <Field label="Verification hash"><span className="font-mono text-[10px] break-all">{transfer.verification_hash || '—'}</span></Field>
      </div>

      {showQr && (
        <div className="p-3 rounded-xl border border-border-warm dark:border-slate-700 bg-bg-inset dark:bg-slate-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><QrCode className="w-4 h-4" /> Pickup QR</div>
          <ErrorNote error={qr.error || qrError} />
          {qr.data && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Pill status={qr.data.expired ? 'expired' : 'valid'}>{qr.data.expired ? 'Expired' : 'Valid'}</Pill>
              <span>Expires {formatTime(qr.data.expires_at)}{!qr.data.expired && <> · <span className="font-mono">{countdown(qr.data.expires_at, now)}</span></>}</span>
              {qr.data.reissued && <Pill tone="amber">Reissued</Pill>}
              <Button variant="ghost" onClick={reissue}><RotateCw className="w-3 h-3" /> Reissue QR</Button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Only the newest QR verifies at pickup. The QR payload itself is not shown here.</p>
        </div>
      )}

      {canCheckSeal && (
        <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => {
          e.preventDefault();
          setSealError(null);
          setSealResult(null);
          try { setSealResult(await checkSeal(transfer.id, seal)); events.reload(); } catch (err) { setSealError(err); }
        }}>
          <input aria-label="Seal number to check" className={`${inputClass} w-48`} placeholder="Seal number" value={seal} onChange={(e) => setSeal(e.target.value)} required />
          <Button type="submit" variant="ghost">Check seal</Button>
          {sealResult && <Pill status={sealResult.match ? 'ok' : 'failed'}>{sealResult.match ? 'Seal matches' : 'Seal does not match'}</Pill>}
          <ErrorNote error={sealError} />
        </form>
      )}

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Custody events</div>
        <ErrorNote error={events.error} onRetry={events.reload} />
        <Table
          rows={events.data || []}
          empty="No custody events yet."
          columns={[
            { key: 'occurred_at', label: 'When', render: (e) => formatTime(e.occurred_at) },
            { key: 'event_type', label: 'Event', render: (e) => humanize(e.event_type) },
            { key: 'method', label: 'Method' },
            { key: 'ok', label: 'Result', render: (e) => <Pill status={e.ok ? 'ok' : 'failed'}>{e.ok ? 'OK' : 'Failed'}</Pill> },
            { key: 'actor', label: 'By', render: (e) => e.actor_role },
            { key: 'seal_number', label: 'Seal', render: (e) => <span className="font-mono">{e.seal_number || '—'}</span> },
            { key: 'detail', label: 'Detail', render: (e) => e.detail || '—' },
            { key: 'photo', label: 'Photo', render: (e) => <PhotoLink transferId={transfer.id} event={e} /> },
          ]}
        />
      </div>
    </div>
  );
}
