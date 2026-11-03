import React, { useEffect, useState } from 'react';
import { Droplet } from 'lucide-react';
import { Card, Loading } from '../components/ui';
import PasswordForm from '../components/PasswordForm';
import { supabase as defaultSupabase } from '../lib/supabase';

const goToConsole = () => window.location.assign('/');

/**
 * Landing page for invite and recovery links. Supabase reads the token from the
 * link and fires PASSWORD_RECOVERY (recovery) or SIGNED_IN (invite); a session
 * that already exists also counts. Without one after a short wait, the link is invalid.
 */
export default function ResetPasswordPage({ supabase = defaultSupabase, onDone = goToConsole, waitMs = 4000 }) {
  const [state, setState] = useState(supabase ? 'checking' : 'invalid');

  useEffect(() => {
    if (!supabase) return undefined;
    let done = false;
    const ready = () => { if (!done) { done = true; setState('ready'); } };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) ready();
    });
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const linkError = hash.get('error') || new URLSearchParams(window.location.search).get('error');
    supabase.auth.getSession().then(({ data: d }) => { if (d?.session) ready(); }).catch(() => {});
    const timer = setTimeout(() => { if (!done) { done = true; setState('invalid'); } }, linkError ? 0 : waitMs);
    return () => { done = true; clearTimeout(timer); data?.subscription?.unsubscribe?.(); };
  }, [supabase, waitMs]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-canvas">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center"><Droplet className="w-6 h-6 text-red-400 fill-red-400" /></div>
          <div>
            <div className="font-extrabold text-lg text-slate-900 dark:text-slate-100">CAELUM</div>
            <div className="text-xs text-slate-500">Set your password</div>
          </div>
        </div>
        {state === 'checking' && <Loading label="Checking your link…" />}
        {state === 'invalid' && (
          <div role="alert" className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
            <p className="font-semibold text-red-700">This link is invalid or has expired.</p>
            <p>Ask an administrator for a new invite, or use “Forgot password?” on the sign-in page.</p>
            <a className="text-brand-burgundy font-semibold underline" href="/">Back to sign-in</a>
          </div>
        )}
        {state === 'ready' && <PasswordForm supabase={supabase} name="Set password" submitLabel="Set password and continue" onDone={onDone} />}
      </Card>
    </div>
  );
}
