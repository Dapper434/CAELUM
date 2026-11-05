import React, { useState } from 'react';
import { formatTime, shortHash } from '../lib/format';
import { actionLabel, groupConsecutive, isImportantAction } from '../lib/auditLabels';
import { Empty, Pill } from './ui';

function DetailDrawer({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label="Audit entry detail">
      <button type="button" className="flex-1 bg-black/30" aria-label="Close detail" onClick={onClose} />
      <aside className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-xl border-l border-border-warm dark:border-slate-700 p-4 overflow-y-auto space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{actionLabel(entry.action)}</div>
            <div className="text-xs text-slate-500 font-mono">#{entry.seq} · {entry.action}</div>
          </div>
          <button type="button" className="text-xs font-semibold text-brand-cobalt" onClick={onClose}>Close</button>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div><dt className="text-slate-400">When</dt><dd>{formatTime(entry.at)}</dd></div>
          <div><dt className="text-slate-400">Actor</dt><dd>{entry.actor_role || '—'}{entry.actor_id ? ` · ${shortHash(entry.actor_id, 8)}` : ''}</dd></div>
          <div><dt className="text-slate-400">Entity</dt><dd>{entry.entity_type || '—'} {entry.entity_id ? shortHash(entry.entity_id, 8) : ''}</dd></div>
          <div><dt className="text-slate-400">Facility</dt><dd className="font-mono">{entry.facility_id ? shortHash(entry.facility_id, 8) : '—'}</dd></div>
        </dl>
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">Payload</div>
          <pre className="bg-bg-inset dark:bg-slate-950 rounded-lg p-2 overflow-x-auto text-[11px]">{JSON.stringify(entry.payload || {}, null, 2)}</pre>
        </div>
        <div className="font-mono text-[10px] text-slate-500 break-all space-y-1">
          <div>prev {entry.prev_hash}</div>
          <div>hash {entry.hash}</div>
        </div>
      </aside>
    </div>
  );
}

function Row({ entry, onOpen }) {
  const important = isImportantAction(entry.action);
  return (
    <button type="button" className="w-full flex items-center gap-3 text-left py-2" onClick={() => onOpen(entry)}>
      <span className="font-mono text-slate-400 w-14">#{entry.seq}</span>
      <span className={`font-semibold ${important ? 'text-status-crimson' : 'text-slate-800 dark:text-slate-100'}`}>
        {actionLabel(entry.action)}
      </span>
      <Pill tone={important ? 'red' : 'slate'}>{entry.actor_role}</Pill>
      <span className="text-slate-500 truncate hidden sm:inline">{entry.entity_type} {entry.entity_id ? shortHash(entry.entity_id, 8) : ''}</span>
      <span className="ml-auto text-slate-400 whitespace-nowrap">{formatTime(entry.at)}</span>
    </button>
  );
}

/** Renders hash-chained audit entries; click a row for a detail drawer. Groups 3+ repeats. */
export default function AuditList({ entries = [], empty = 'No audit entries.', group = true }) {
  const [open, setOpen] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  if (!entries.length) return <Empty>{empty}</Empty>;
  const items = group ? groupConsecutive(entries) : entries.map((entry) => ({ kind: 'single', entry }));

  return (
    <>
      <ul className="divide-y divide-border-warm dark:divide-slate-700">
        {items.map((item) => {
          if (item.kind === 'single') {
            return (
              <li key={item.entry.id || item.entry.seq} className="text-xs">
                <Row entry={item.entry} onOpen={setOpen} />
              </li>
            );
          }
          const key = `${item.action}-${item.first.seq}-${item.last.seq}`;
          const isOpen = expanded.has(key);
          return (
            <li key={key} className="text-xs py-2">
              <button
                type="button"
                className="w-full flex items-center gap-3 text-left"
                onClick={() => setExpanded((s) => {
                  const n = new Set(s);
                  if (n.has(key)) n.delete(key); else n.add(key);
                  return n;
                })}
              >
                <span className="font-mono text-slate-400 w-14">×{item.count}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {actionLabel(item.action)} ({item.count} times)
                </span>
                <span className="ml-auto text-slate-400 whitespace-nowrap">
                  {formatTime(item.last.at)} → {formatTime(item.first.at)}
                </span>
              </button>
              {isOpen && (
                <ul className="ml-4 mt-1 border-l border-border-warm dark:border-slate-700 pl-2">
                  {item.entries.map((e) => (
                    <li key={e.id || e.seq}><Row entry={e} onOpen={setOpen} /></li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <DetailDrawer entry={open} onClose={() => setOpen(null)} />
    </>
  );
}
