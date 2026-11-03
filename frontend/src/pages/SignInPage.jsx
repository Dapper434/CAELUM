import React, { useState } from 'react';
import { Droplet, LogIn, FlaskConical } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { config as defaultConfig } from '../lib/config';
import { isSupabaseConfigured } from '../lib/supabase';
import { Button, Card, inputClass } from '../components/ui';

export default function SignInPage({ config = defaultConfig, passwordEnabled = isSupabaseConfigured }) {
  const { signInWithPassword, signInDemo, error, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

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

        {passwordEnabled ? (
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
          </form>
        ) : (
          <p className="text-xs text-slate-500">Password sign-in needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
        )}

        {config.demoMode && (
          <div className="mt-5 pt-4 border-t border-border-warm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Demo mode (in-memory API only)</div>
            <Button variant="burgundy" className="w-full" disabled={busy} onClick={() => run(() => signInDemo('admin'))}>
              <FlaskConical className="w-3.5 h-3.5" /> Sign in as demo admin (admin@caelum.demo)
            </Button>
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-xs text-red-700">{error}</p>}
      </Card>
    </div>
  );
}
