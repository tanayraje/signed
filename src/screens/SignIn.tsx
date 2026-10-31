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
  const [useEmail, setUseEmail] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function google() {
    setState('busy');
    rememberPlace();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } }
    });
    if (error) { setState('error'); setMsg('Google sign-in is not available right now. Try again in a moment.'); }
  }

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

      <button className="btn block" style={{ background: '#FBF8F2', gap: 12 }} disabled={state === 'busy' || !configured} onClick={google}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.6 7.1-17z" />
          <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
        </svg>
        Continue with Google
      </button>

      {state === 'error' && <p className="small center" role="alert">{msg}</p>}

      {!useEmail ? (
        <button className="chip" style={{ alignSelf: 'center', border: 0 }} onClick={() => setUseEmail(true)}>Use email instead</button>
      ) : state === 'sent' ? (
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
