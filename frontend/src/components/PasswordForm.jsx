import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button, inputClass } from './ui';
import { validateNewPassword } from '../lib/password';

/** New password + confirm, validated, then supabase.auth.updateUser({ password }). */
export default function PasswordForm({ supabase, onDone, submitLabel = 'Save password', name = 'Change password' }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const problem = validateNewPassword(password, confirm);
    setError(problem);
    if (problem) return;
    if (!supabase) { setError('Supabase Auth is not configured for this build.'); return; }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message || 'Could not update the password.'); return; }
      setPassword(''); setConfirm('');
      onDone?.();
    } catch {
      setError('Network error: could not reach the sign-in service. Try again.');
    } finally { setBusy(false); }
  };

  const label = 'block text-xs font-semibold text-slate-600 dark:text-slate-300';
  return (
    <form aria-label={name} className="space-y-3" onSubmit={submit} noValidate>
      <label className={label}>New password
        <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className={label}>Confirm password
        <input className={`${inputClass} mt-1`} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}><KeyRound className="w-3.5 h-3.5" /> {submitLabel}</Button>
    </form>
  );
}
