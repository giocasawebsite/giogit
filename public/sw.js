// GioCasa Admin Service Worker - Real-Time Push Notifications & Background Sync
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all active clients immediately
  event.waitUntil(self.clients.claim());
});

// Push Event: Triggered when the backend dispatches a Web Push alert
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {
    title: 'GioCasa Operations Alert',
    body: 'New operational activity recorded in GioCasa hub.',
    icon: '/assets/giocasa_logo_circle.png',
    badge: '/assets/giocasa_logo_circle.png',
    tag: 'giocasa-ops-alert',
    data: { url: '/#/admin' },
  };

  try {
    const json = event.data.json();
    if (json) {
      payload = {
        title: json.title || payload.title,
        body: json.body || payload.body,
        icon: json.icon || payload.icon,
        badge: json.badge || payload.badge,
        tag: json.tag || `giocasa-${Date.now()}`,
        data: json.data || payload.data,
      };
    }
  } catch (err) {
    // If text payload was sent instead of JSON
    try {
      payload.body = event.data.text() || payload.body;
    } catch (e) {
      // Keep defaults
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    data: payload.data,
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Open in Admin Hub' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Notification Click Event: Focuses or opens the relevant admin section
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const clickData = event.notification.data || {};
  let targetUrl = clickData.url || '/#/admin';

  // Ensure relative URLs are resolved with origin
  if (!targetUrl.startsWith('http')) {
    targetUrl = new URL(targetUrl, self.location.origin).href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing window is open, focus it and navigate to the target tab
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          // Check if window is GioCasa Admin
          if (client.url.includes('/admin') || client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }

      // 2. If no matching window is open, launch a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
