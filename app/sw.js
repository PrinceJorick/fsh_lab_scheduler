// ============================================================================
// SW.JS — FSH Lab Scheduler Service Worker
// Handles background push notifications on any device
// Place this file in the ROOT of your project (same level as index.html)
// ============================================================================

const CACHE_NAME = 'fsh-scheduler-v1';

// ============================================================================
// INSTALL & ACTIVATE
// ============================================================================

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

// ============================================================================
// PUSH EVENT — fires when server sends a push notification
// ============================================================================

self.addEventListener('push', event => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'FSH Lab Scheduler', body: event.data.text() };
    }

    const title = data.title || 'FSH Lab Scheduler';
    const options = {
        body:    data.body    || 'You have a new notification.',
        icon:    data.icon    || '../public/fsh_logo_colored.png',
        badge:   data.badge   || '../public/fsh_logo_colored.png',
        tag:     data.tag     || 'fsh-notification',
        data:    data.data    || { url: '/mail' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ============================================================================
// NOTIFICATION CLICK — opens the app when user taps the notification
// ============================================================================

self.addEventListener('notificationclick', event => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/mail';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // If app is already open, focus it and navigate
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
