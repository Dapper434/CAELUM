/** Display helpers. API times are UTC; the console shows Africa/Nairobi (EAT). */
const TZ = 'Africa/Nairobi';

export function formatTime(iso, { withDate = true } = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const opts = withDate
    ? { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
    : { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  return `${new Intl.DateTimeFormat('en-GB', opts).format(d)} EAT`;
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: value.length === 10 ? 'UTC' : TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** "4m 05s" until iso, or "expired". */
export function countdown(iso, now = Date.now()) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 'expired';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function humanize(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/_/g, ' ');
}

export function shortHash(hash, size = 10) {
  return hash ? `${hash.slice(0, size)}…` : '—';
}

export function formatTemp(value) {
  return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)} °C`;
}
