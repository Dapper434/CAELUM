import React, { useState } from 'react';
import { formatTime, shortHash } from '../lib/format';
import { Empty, Pill } from './ui';

/** Renders hash-chained audit entries; click a row to see payload and hashes. */
export default function AuditList({ entries = [], empty = 'No audit entries.' }) {
  const [open, setOpen] = useState(null);
  if (!entries.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="divide-y divide-border-warm dark:divide-slate-700">
      {entries.map((e) => (
        <li key={e.id || e.seq} className="py-2 text-xs">
          <button type="button" className="w-full flex items-center gap-3 text-left" onClick={() => setOpen(open === e.seq ? null : e.seq)}>
            <span className="font-mono text-slate-400 w-14">#{e.seq}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{e.action}</span>
            <Pill tone="slate">{e.actor_role}</Pill>
            <span className="text-slate-500 truncate hidden sm:inline">{e.entity_type} {e.entity_id ? shortHash(e.entity_id, 8) : ''}</span>
            <span className="ml-auto text-slate-400 whitespace-nowrap">{formatTime(e.at)}</span>
          </button>
          {open === e.seq && (
            <div className="mt-2 ml-14 space-y-1">
              <pre className="bg-bg-inset dark:bg-slate-900 rounded-lg p-2 overflow-x-auto text-[11px]">{JSON.stringify(e.payload, null, 2)}</pre>
              <div className="font-mono text-[10px] text-slate-500 break-all">prev {e.prev_hash}</div>
              <div className="font-mono text-[10px] text-slate-500 break-all">hash {e.hash}</div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
