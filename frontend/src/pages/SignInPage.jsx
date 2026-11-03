import React, { useState } from 'react';
import { Droplet, LogIn, FlaskConical } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { config as defaultConfig } from '../lib/config';
import { isSupabaseConfigured, supabase as defaultSupabase } from '../lib/supabase';
import { Button, Card, inputClass } from '../components/ui';

// Demo accounts on the live Supabase project. Only the email is prefilled; passwords are never embedded.
export const DEMO_ADMIN_EMAIL = 'admin@caelum.demo';
export const RESET_SENT_MESSAGE = 'If that email exists, we sent a link';

function ForgotPassword({ supabase, initialEmail, onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await supabase?.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    } catch { /* neutral message either way */ }
    setBusy(false);
    setSent(true);
  };
  return (
    <form aria-label="Reset password" className="space-y-3" onSubmit={submit}>
      <label className="block text-xs font-semibold text-slate-600">
        Email
        <input className={`${inputClass} mt-1`} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <Button type="submit" className="w-full" disabled={busy}>Send reset link</Button>
      {sent && <p role="status" className="text-xs text-slate-600">{RESET_SENT_MESSAGE}</p>}
      <button type="button" className="text-xs text-brand-burgundy underline" onClick={onBack}>Back to sign-in</button>
    </form>
  );
}

export default function SignInPage({ config = defaultConfig, passwordEnabled = isSupabaseConfigured, supabase = defaultSupabase }) {
  const { signInWithPassword, error, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-canvas">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center">
            <Droplet className="w-6 h-6 text-red-400 fill-red-400" />
          </div>
          <div>
            <div className="font-extrabold text-lg text-slate-900 dark:text-slate-100">CAELUM</div>
            <div className="text-xs text-slate-500">Admin console sign-in</div>
          </div>
        </div>

        {!config.apiBaseUrl && (
          <p role="alert" className="text-xs text-red-700 mb-3">VITE_API_BASE_URL is not set for this build, so the console cannot reach the API.</p>
        )}

        {passwordEnabled && forgot ? (
          <ForgotPassword supabase={supabase} initialEmail={email} onBack={() => setForgot(false)} />
        ) : passwordEnabled ? (
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); run(() => signInWithPassword(email, password)); }}
          >
            <label className="block text-xs font-semibold text-slate-600">
              Email
              <input className={`${inputClass} mt-1`} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Password
              <input className={`${inputClass} mt-1`} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <Button type="submit" className="w-full" disabled={busy || status === 'loading'}>
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </Button>
            <button type="button" className="text-xs text-brand-burgundy underline" onClick={() => setForgot(true)}>Forgot password?</button>
          </form>
        ) : (
          <p className="text-xs text-slate-500">Password sign-in needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.</p>
        )}

        {config.demoMode && passwordEnabled && (
          <div className="mt-5 pt-4 border-t border-border-warm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Demo</div>
            <Button variant="burgundy" className="w-full" disabled={busy} onClick={() => { setEmail(DEMO_ADMIN_EMAIL); setPassword(''); }}>
              <FlaskConical className="w-3.5 h-3.5" /> Use demo admin ({DEMO_ADMIN_EMAIL})
            </Button>
            <p className="mt-1.5 text-[11px] text-slate-500">Fills in the email. Enter the demo password you were given.</p>
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-xs text-red-700">{error}</p>}
      </Card>
    </div>
  );
}
