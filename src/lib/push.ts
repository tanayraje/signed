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

/** Asks for notification permission and saves this device. Must run from a tap. */
export async function enablePush(userId: string): Promise<string> {
  if (!pushSupported()) {
    return isInstalled() ? 'This device does not support notifications.' : 'Add Signed to your Home Screen first, then turn on notifications.';
  }
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key) return 'Notifications are not set up on the server yet.';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'Notifications are off. You can turn them on in your phone settings.';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: 'endpoint' }
  );
  return error ? 'Could not save this device. Try again.' : 'Notifications are on.';
}
