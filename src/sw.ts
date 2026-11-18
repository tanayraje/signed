/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);

// Pictures (seals, owls, perches, paper, stamps) come from this phone straight away, and are refreshed in the
// background, so a redrawn picture still shows up on the next visit.
registerRoute(
  ({ request, url }) => url.origin === self.location.origin && (request.destination === 'image' || /^\/(assets|owls)\//.test(url.pathname)),
  new StaleWhileRevalidate({ cacheName: 'signed-pictures', plugins: [new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 })] })
);
self.addEventListener('install', () => { void self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  const data = (() => { try { return event.data?.json() ?? {}; } catch { return { title: 'Signed', body: event.data?.text() }; } })();
  const nav = self.navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void> };
  if (typeof data.badge === 'number' && nav.setAppBadge) void nav.setAppBadge(data.badge).catch(() => undefined);
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Signed', {
      body: data.body ?? '',
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: data.tag,
      data: { url: data.url ?? '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { void (c as WindowClient).navigate(url); return (c as WindowClient).focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
