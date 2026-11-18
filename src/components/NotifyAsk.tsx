import { useEffect, useState } from 'react';
import type { Profile } from '../lib/types';
import { enablePush, isInstalled, pushState, pushSupported } from '../lib/push';
import { Owl } from './bits';
import { useStore } from '../lib/store';

const OFF_KEY = 'signed.pushOff';
const BLOCKED_KEY = 'signed.pushBlockedAsked';
const INSTALL_KEY = 'signed.installAsked';
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
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
type Step = 'location' | 'locBlocked' | 'ask' | 'blocked' | 'install';

async function geoState(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
  try { return (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state; } catch { return 'unknown'; }
}

/** Which notification sheet (if any) this open should show. */
async function notifyStep(): Promise<Step | null> {
  if (read(OFF_KEY)) return null;
  // iPhones only allow notifications once Signed is on the Home Screen.
  if (!pushSupported() || (isIOS() && !isInstalled())) {
    return isIOS() && !isInstalled() && read(INSTALL_KEY) !== new Date().toDateString() ? 'install' : null;
  }
  const s = await pushState();
  if (s === 'off') return 'ask';
  if (s === 'blocked' && read(BLOCKED_KEY) !== new Date().toDateString()) return 'blocked';
  return null;
}

/**
 * Every time Signed opens without location or notifications, it asks: location first (letters can't
 * fly without it), then notifications. Phones only let a tap start a permission prompt, so these are
 * sheets with a button. If something was blocked in the phone's settings, it explains how to allow it.
 */
export default function NotifyAsk({ me, uid }: { me: Profile; uid: string }) {
  const { locate } = useStore();
  const [state, setState] = useState<Step | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (askedThisOpen) return;
    void (async () => {
      const g = await geoState();
      let step: Step | null = null;
      if (g === 'denied') step = 'locBlocked';
      else if (me.last_lat == null || g === 'prompt') step = 'location';
      else step = await notifyStep();
      if (askedThisOpen || !step) return;
      askedThisOpen = true;
      setState(step);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;

  const next = async () => { setMsg(''); setState(await notifyStep()); };
  const close = () => {
    if (state === 'blocked') write(BLOCKED_KEY, new Date().toDateString());
    if (state === 'install') write(INSTALL_KEY, new Date().toDateString());
    if (state === 'location' || state === 'locBlocked') { void next(); return; }
    setState(null);
  };

  const copy: Record<Step, { title: string; body: string }> = {
    location: { title: 'Where should your owl fly from?', body: 'Owls fly letters between where you and your friends are, so Signed needs your location. Only your nearest city is shown to friends.' },
    locBlocked: { title: 'Location is blocked', body: isIOS()
      ? 'Owls can’t find you without it. Open Settings, go to Privacy & Security, then Location Services, find Safari Websites (or Signed) and choose While Using the App. Then reopen Signed.'
      : 'Owls can’t find you without it. Tap the icon beside the address bar (or long-press the Signed icon and open App info), go to Permissions, then Location, and choose Allow. Then reopen Signed.' },
    ask: { title: 'Know when an owl lands', body: 'Signed tells you when a letter takes off, where the owl is on the way, and when it reaches your windowsill.' },
    blocked: { title: 'Notifications are blocked', body: 'To hear when letters land, open your phone\'s Settings, go to Notifications, then Signed, and turn on Allow Notifications.' },
    install: { title: 'Add Signed to your Home Screen', body: 'iPhones only send notifications to apps on the Home Screen. Tap the Share button in Safari, choose Add to Home Screen, then open Signed from there.' }
  };

  return (
    <div className="sheet-back" onClick={close}>
      <div className="stamp-sheet stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={state === 'location' || state === 'locBlocked' ? 'Location' : 'Notifications'} style={{ color: '#2B2622', alignItems: 'center', textAlign: 'center' }}>
        <Owl p={me} width={64} />
        <h2 style={{ margin: 0, fontSize: 22 }}>{copy[state].title}</h2>
        <p className="muted" style={{ margin: 0, maxWidth: 320 }}>{copy[state].body}</p>
        {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
        {state === 'location' && <button className="btn primary block" onClick={async () => {
          setMsg('Asking your phone…');
          const r = await locate();
          if (r === 'ok') { void next(); return; }
          if (r === 'denied') { setMsg(''); setState('locBlocked'); return; }
          setMsg('Couldn’t find you just now. Check that location is on, then try again.');
        }}>Share my location</button>}
        {state === 'ask' && <button className="btn primary block" onClick={async () => {
          setMsg('Asking your phone…');
          const m = await enablePush(uid);
          if (m === 'Notifications are on.') { rememberPushChoice(true); setState(null); return; }
          setMsg(m);
          if ((await pushState()) === 'blocked') setState('blocked');
        }}>Turn on notifications</button>}
        {(state === 'blocked' || state === 'locBlocked' || state === 'install') && <button className="btn primary block" onClick={close}>Got it</button>}
        {(state === 'ask' || state === 'location') && <button className="btn block" style={{ border: 0, background: 'none' }} onClick={close}>Not now</button>}
      </div>
    </div>
  );
}
