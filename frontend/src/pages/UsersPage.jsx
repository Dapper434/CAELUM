import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Send, Ban } from 'lucide-react';
import { Button, Card, ErrorNote, Loading, PageHeader, Pill, Table, inputClass } from '../components/ui';
import { useApiData } from '../hooks/useApiData';
import { listFacilities } from '../lib/api/facilities';
import { listCouriers } from '../lib/api/couriers';
import {
  FACILITY_ROLES, USER_ROLES, USERS_PAGE_SIZE, disableUser, hasMoreUsers, inviteUser, listUsers, resendInvite,
  userErrorMessage, validateInvite,
} from '../lib/api/users';
import { formatTime, humanize } from '../lib/format';

const EMPTY = { email: '', full_name: '', role: 'admin', facility_id: '', courier_id: '' };

export function InviteForm({ onInvited }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const needsFacility = FACILITY_ROLES.includes(form.role);
  const facilities = useApiData(() => listFacilities(), [], { enabled: needsFacility });
  const couriers = useApiData(() => listCouriers(), [], { enabled: form.role === 'courier' });
  useEffect(() => { if (needsFacility && !facilities.data && !facilities.loading) facilities.reload(); }, [needsFacility]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (form.role === 'courier' && !couriers.data && !couriers.loading) couriers.reload(); }, [form.role]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = validateInvite(form);
    setErrors(found); setServerError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const user = await inviteUser(form);
      setForm(EMPTY);
      onInvited?.(user);
    } catch (err) {
      setServerError(userErrorMessage(err));
    } finally { setBusy(false); }
  };

  const err = (k) => errors[k] && <span className="block text-[11px] text-red-700 mt-0.5">{errors[k]}</span>;
  const label = 'block text-xs font-semibold text-slate-600 dark:text-slate-300';
  return (
    <form aria-label="Invite user" className="grid sm:grid-cols-2 gap-3" onSubmit={submit} noValidate>
      <label className={label}>Email<input className={`${inputClass} mt-1`} type="email" value={form.email} onChange={set('email')} />{err('email')}</label>
      <label className={label}>Full name<input className={`${inputClass} mt-1`} value={form.full_name} onChange={set('full_name')} />{err('full_name')}</label>
      <label className={label}>Role
        <select className={`${inputClass} mt-1`} aria-label="Role" value={form.role} onChange={set('role')}>
          {USER_ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
        </select>
      </label>
      {needsFacility && (
        <label className={label}>Facility
          <select className={`${inputClass} mt-1`} aria-label="Facility" value={form.facility_id} onChange={set('facility_id')} required>
            <option value="">{facilities.loading ? 'Loading…' : 'Pick a facility'}</option>
            {(facilities.data || []).map((f) => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
          </select>{err('facility_id')}
        </label>
      )}
      {form.role === 'courier' && (
        <label className={label}>Courier profile (optional)
          <select className={`${inputClass} mt-1`} aria-label="Courier profile" value={form.courier_id} onChange={set('courier_id')}>
            <option value="">None</option>
            {(couriers.data || []).map((c) => <option key={c.id} value={c.id}>{c.full_name || c.id}</option>)}
          </select>
        </label>
      )}
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={busy}><Send className="w-3.5 h-3.5" /> Send invite</Button>
        {serverError && <p role="alert" className="text-xs text-red-700">{serverError}</p>}
      </div>
    </form>
  );
}

export default function UsersPage({ confirm = (msg) => window.confirm(msg) }) {
  const [rows, setRows] = useState([]);
  const [more, setMore] = useState(false);
  const [state, setState] = useState({ loading: true, error: null });
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async (offset = 0) => {
    setState({ loading: true, error: null });
    try {
      const { data, meta } = await listUsers({ offset });
      const page = data || [];
      setRows((prev) => (offset ? [...prev, ...page] : page));
      setMore(hasMoreUsers(meta, page.length, USERS_PAGE_SIZE));
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error: { ...error, message: userErrorMessage(error) } });
    }
  }, []);
  useEffect(() => { load(0); }, [load]);

  const act = async (fn, okText) => {
    setActionError(''); setNotice('');
    try { await fn(); setNotice(okText); await load(0); } catch (err) { setActionError(userErrorMessage(err)); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Users" subtitle="Console and app accounts, invites and access." onRefresh={() => load(0)} loading={state.loading}>
        <Button onClick={() => setInviting((v) => !v)}><UserPlus className="w-3.5 h-3.5" /> Invite user</Button>
      </PageHeader>
      <ErrorNote error={state.error} onRetry={() => load(0)} />
      {inviting && (
        <Card className="p-4">
          <InviteForm onInvited={(u) => { setInviting(false); setNotice(`Invite sent to ${u?.email || 'the user'}.`); load(0); }} />
        </Card>
      )}
      {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
      {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
      <Card>
        {state.loading && !rows.length ? <Loading /> : (
          <Table
            rows={rows}
            rowKey="user_id"
            empty="No users."
            columns={[
              { key: 'email', label: 'User', render: (u) => <div><div className="font-semibold">{u.full_name || '—'}</div><div className="text-slate-500">{u.email}</div></div> },
              { key: 'role', label: 'Role', render: (u) => humanize(u.role) },
              { key: 'facility_name', label: 'Facility', render: (u) => u.facility_name || '—' },
              { key: 'confirmed', label: 'Status', render: (u) => (u.confirmed ? <Pill tone="green">Confirmed</Pill> : <Pill tone="amber">Pending</Pill>) },
              { key: 'last_sign_in_at', label: 'Last sign-in', render: (u) => (u.last_sign_in_at ? formatTime(u.last_sign_in_at) : 'Never') },
              { key: 'actions', label: '', render: (u) => (
                <div className="flex gap-1.5 justify-end">
                  {!u.confirmed && <Button variant="ghost" aria-label={`Resend invite to ${u.email}`} onClick={() => act(() => resendInvite(u.user_id), `Invite re-sent to ${u.email}.`)}><Send className="w-3.5 h-3.5" /> Resend</Button>}
                  <Button variant="ghost" aria-label={`Disable ${u.email}`} onClick={() => { if (confirm(`Disable ${u.email}? They will no longer be able to sign in.`)) act(() => disableUser(u.user_id), `${u.email} disabled.`); }}><Ban className="w-3.5 h-3.5" /> Disable</Button>
                </div>
              ) },
            ]}
          />
        )}
        {more && <div className="p-3 text-center"><Button variant="ghost" disabled={state.loading} onClick={() => load(rows.length)}>Load more</Button></div>}
      </Card>
    </div>
  );
}
