import { useEffect, useState } from 'react';
import type { Profile } from '../lib/types';
import { enablePush, isInstalled, pushState, pushSupported } from '../lib/push';
import { Owl } from './bits';

const OFF_KEY = 'signed.pushOff';
const BLOCKED_KEY = 'signed.pushBlockedAsked';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } };

// Asked at most once each time Signed is opened (coming back from the background counts as opening).
let askedThisOpen = false;
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) askedThisOpen = false; });

/** Profile's "Turn off" is the only way to opt out of the asking; "Turn on" clears it. */
export const rememberPushChoice = (on: boolean) => write(OFF_KEY, on ? null : '1');

/**
 * Every time Signed opens without notifications, it asks, like it does for location.
 * Phones only let a tap start the permission prompt, so this is a sheet with a button.
 * If notifications were blocked in the phone's settings, it explains how to allow them (once a day).
 */
export default function NotifyAsk({ me, uid }: { me: Profile; uid: string }) {
  const [state, setState] = useState<'ask' | 'blocked' | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (askedThisOpen || !pushSupported() || !isInstalled() || read(OFF_KEY)) return;
    void pushState().then((s) => {
      if (askedThisOpen) return;
      if (s === 'off' || s === 'blocked') askedThisOpen = true;
      if (s === 'off') setState('ask');
      else if (s === 'blocked' && read(BLOCKED_KEY) !== new Date().toDateString()) setState('blocked');
    });
  }, []);
  if (!state) return null;
  const close = () => { if (state === 'blocked') write(BLOCKED_KEY, new Date().toDateString()); setState(null); };

  return (
    <div className="sheet-back" onClick={close}>
      <div className="stamp-sheet stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Notifications" style={{ color: '#2B2622', alignItems: 'center', textAlign: 'center' }}>
        <Owl p={me} width={64} />
        <h2 style={{ margin: 0, fontSize: 22 }}>{state === 'ask' ? 'Know when an owl lands' : 'Notifications are blocked'}</h2>
        {state === 'ask'
          ? <p className="muted" style={{ margin: 0, maxWidth: 320 }}>Signed tells you when a letter takes off, where the owl is on the way, and when it reaches your windowsill.</p>
          : <p className="muted" style={{ margin: 0, maxWidth: 320 }}>To hear when letters land, open your phone's Settings, go to Notifications, then Signed, and turn on Allow Notifications.</p>}
        {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
        {state === 'ask'
          ? <button className="btn primary block" onClick={async () => {
              setMsg('Asking your phone…');
              const m = await enablePush(uid);
              if (m === 'Notifications are on.') { rememberPushChoice(true); setState(null); return; }
              setMsg(m);
              if ((await pushState()) === 'blocked') setState('blocked');
            }}>Turn on notifications</button>
          : <button className="btn primary block" onClick={close}>Got it</button>}
        {state === 'ask' && <button className="btn block" style={{ border: 0, background: 'none' }} onClick={close}>Not now</button>}
      </div>
    </div>
  );
}
