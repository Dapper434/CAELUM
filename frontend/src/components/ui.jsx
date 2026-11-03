import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { humanize } from '../lib/format';

/** Shared building blocks so every page keeps the CAELUM look. */
export function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, onRefresh, loading, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {onRefresh && (
          <Button variant="ghost" onClick={onRefresh} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        )}
      </div>
    </div>
  );
}

const VARIANTS = {
  primary: 'bg-brand-cobalt text-white border-brand-cobalt hover:opacity-90',
  danger: 'bg-status-crimson text-white border-status-crimson hover:opacity-90',
  success: 'bg-status-emerald text-white border-status-emerald hover:opacity-90',
  burgundy: 'bg-brand-burgundy text-white border-brand-burgundy hover:opacity-90',
  ghost: 'bg-bg-inset dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-border-warm dark:border-slate-700 hover:border-brand-burgundy/40',
};

export function Button({ variant = 'primary', className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const TONES = {
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  blue: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  slate: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600',
};

const STATUS_TONES = {
  red: ['critical', 'emergency', 'cancelled', 'declined', 'expired', 'lapsed', 'discarded', 'dismissed', 'offline', 'damaged', 'temperature_breach', 'invalid', 'failed'],
  amber: ['urgent', 'pending', 'held', 'suggested', 'courier_assigned', 'reserved', 'moderate', 'packed', 'on_job', 'warning', 'late'],
  green: ['available', 'delivered', 'fulfilled', 'accepted', 'matched', 'ok', 'valid', 'resolving', 'active'],
  blue: ['open', 'offered', 'in_transit', 'arrived', 'routine', 'transferred'],
};

export function toneFor(status) {
  const key = String(status || '').toLowerCase();
  return Object.keys(STATUS_TONES).find((tone) => STATUS_TONES[tone].includes(key)) || 'slate';
}

export function Pill({ tone, status, children }) {
  const t = tone || toneFor(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${TONES[t]}`}>
      {children ?? humanize(status)}
    </span>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-6 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200 text-xs">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-bold">{error.code ? humanize(error.code) : 'Something went wrong'}</div>
        <div>{error.message}</div>
      </div>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">{children}</div>;
}

export function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 break-words">{children ?? '—'}</div>
    </div>
  );
}

export function Table({ columns, rows, rowKey = 'id', onRowClick, empty = 'Nothing to show.' }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-border-warm dark:border-slate-700">
            {columns.map((c) => <th key={c.key} className="px-3 py-2 font-bold whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-border-warm/60 dark:border-slate-700/60 ${onRowClick ? 'cursor-pointer hover:bg-bg-inset dark:hover:bg-slate-700/40' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 align-top text-slate-700 dark:text-slate-200">
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const inputClass =
  'w-full px-2.5 py-1.5 rounded-lg text-xs border border-border-warm dark:border-slate-600 bg-bg-inset dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-cobalt';
