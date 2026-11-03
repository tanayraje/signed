import { supabase } from './supabase';

function b64ToBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

let cachedKey: string | null = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? null;
/** Fetch the push key ahead of time, so the tap itself goes straight to the permission prompt. */
export async function preparePush() {
  if (cachedKey) return;
  const { data } = await supabase.rpc('vapid_public_key');
  cachedKey = (data as string | null) ?? null;
}

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Asks for notification permission and saves this device. Must run straight from a tap (iPhones insist). */
export async function enablePush(userId: string): Promise<string> {
  if (!pushSupported()) {
    return isInstalled() ? 'This device does not support notifications.' : 'Add Signed to your Home Screen first, then turn on notifications.';
  }
  // Ask first, before any other waiting, or the phone may ignore the request.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'Notifications are off. You can turn them on in your phone settings.';
  try {
    if (!cachedKey) await preparePush();
    if (!cachedKey) return 'Notifications are still being set up. Try again in a minute.';
    const reg = await withTimeout(navigator.serviceWorker.ready, 8000);
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cachedKey) }));
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: 'endpoint' }
    );
    if (error) return `Could not save this phone (${error.message}). Try again.`;
    return 'Notifications are on.';
  } catch (e) {
    const m = (e as Error).message || String(e);
    if (m === 'timeout') return 'Signed is still getting ready on this phone. Close and reopen it, then try again.';
    return `Could not turn on notifications: ${m}`;
  }
}

/** Where notifications stand on this device: on, off, blocked in settings, or not possible here. */
export async function pushState(): Promise<'on' | 'off' | 'blocked' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 5000);
    return (await reg.pushManager.getSubscription()) ? 'on' : 'off';
  } catch { return 'off'; }
}

/** Stops notifications on this phone: forgets the subscription here and on the server. */
export async function disablePush(): Promise<string> {
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 5000);
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
    return 'Notifications are off for this phone.';
  } catch {
    return 'Could not turn them off. Try again.';
  }
}
