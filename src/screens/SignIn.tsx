import { useState } from 'react';
import { supabase, configured } from '../lib/supabase';

const AFTER = 'signed.afterSignIn';

/** Remember where the person was going (an invite, say) so sign-in can bring them back. */
function rememberPlace() {
  try { if (window.location.hash) localStorage.setItem(AFTER, window.location.hash); } catch { /* storage blocked */ }
}

export function restorePlace() {
  try {
    const h = localStorage.getItem(AFTER);
    if (h) { localStorage.removeItem(AFTER); window.location.hash = h; }
  } catch { /* storage blocked */ }
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    rememberPlace();
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/` } });
    if (error) { setState('error'); setMsg('That link did not send. Check the address and try again.'); }
    else setState('sent');
  }

  return (
    <main className="app" style={{ justifyContent: 'center' }}>
      <div className="center stack" style={{ alignItems: 'center', gap: 6 }}>
        <div className="wordmark"><span style={{ fontSize: 76 }}>Signed</span><img src="/assets/logo-seal.png" alt="" width={38} height={38} style={{ marginBottom: 10 }} /></div>
        <p className="muted">Letters between friends, carried by owls.</p>
      </div>
      {!configured && <p className="card small" style={{ padding: 14 }}>This build has no Supabase project yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p>}

      <p className="muted center small">We couldn't open your account automatically. Sign in with your email instead.</p>

      {state === 'error' && <p className="small center" role="alert">{msg}</p>}

      {state === 'sent' ? (
        <div className="card stack center" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, color: 'var(--ink)' }}>Check your email</h2>
          <p className="muted">We sent a sign-in link to {email}. Open it on this phone.</p>
        </div>
      ) : (
        <form className="stack" onSubmit={send}>
          <label htmlFor="email"><h2>Your email</h2></label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button className="btn wax block" disabled={state === 'busy' || !configured}>{state === 'busy' ? 'Sending…' : 'Send me a sign-in link'}</button>
        </form>
      )}
    </main>
  );
}
