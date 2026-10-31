/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);
self.addEventListener('install', () => { void self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  const data = (() => { try { return event.data?.json() ?? {}; } catch { return { title: 'Signed', body: event.data?.text() }; } })();
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
