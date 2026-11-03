import React from 'react';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { formatTime, humanize } from '../../lib/format';

const FLOW = ['accepted', 'packed', 'courier_assigned', 'in_transit', 'arrived', 'delivered'];

/** accepted → packed → courier_assigned → in_transit → arrived → delivered, with when and who. */
export default function StageTimeline({ transfer }) {
  const history = transfer.stage_history || [];
  const reached = (stage) => history.filter((h) => h.stage === stage).pop();
  const cancelled = transfer.stage === 'cancelled';
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Stage history">
      {FLOW.map((stage) => {
        const h = reached(stage);
        const current = transfer.stage === stage;
        return (
          <li key={stage} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] ${current ? 'border-brand-cobalt bg-blue-50 dark:bg-blue-950/30' : 'border-border-warm dark:border-slate-700'}`}>
            {h ? <CheckCircle2 className="w-3.5 h-3.5 text-status-emerald" /> : <Circle className="w-3.5 h-3.5 text-slate-300" />}
            <div>
              <div className="font-bold text-slate-700 dark:text-slate-200">{humanize(stage)}</div>
              {h && <div className="text-slate-400">{formatTime(h.at)} · {h.role}</div>}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-300 text-[11px]">
          <XCircle className="w-3.5 h-3.5 text-status-crimson" />
          <div><div className="font-bold text-status-crimson">Cancelled</div><div className="text-slate-400">{humanize(transfer.cancel_reason)}</div></div>
        </li>
      )}
    </ol>
  );
}
