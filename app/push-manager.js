// ============================================================================
// PUSH-MANAGER.JS — Web Push Subscription Manager
// Include this on every protected page (dashboard, laboratory, mail, profile)
// It registers the service worker and subscribes the user to push notifications
// ============================================================================

const PUSH_API_BASE = 'https://fsh-scheduler.medranowilljairuz.workers.dev';

// ============================================================================
// MAIN INIT — call once per page load after user is confirmed logged in
// ============================================================================

async function initPushNotifications() {
    // Web Push requires HTTPS and a supporting browser
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported in this browser.');
        return;
    }

    const token = localStorage.getItem('fsh_token');
    if (!token) return; // Not logged in

    try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered:', registration.scope);

        // Check existing permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Push permission denied by user.');
            return;
        }

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            // Re-send to server in case it was lost (idempotent upsert on server)
            await sendSubscriptionToServer(existingSubscription, token);
            return;
        }

        // Get VAPID public key from server
        const res = await fetch(`${PUSH_API_BASE}/api/push/vapid-public-key`);
        const { publicKey } = await res.json();

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly:      true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // Send subscription to our Worker to save in D1
        await sendSubscriptionToServer(subscription, token);
        console.log('Push notifications enabled.');

    } catch (err) {
        console.error('Push notification setup failed:', err);
    }
}

async function sendSubscriptionToServer(subscription, token) {
    const subJson = subscription.toJSON();
    await fetch(`${PUSH_API_BASE}/api/push/subscribe`, {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: {
                p256dh: subJson.keys.p256dh,
                auth:   subJson.keys.auth
            }
        })
    });
}

// ============================================================================
// UNSUBSCRIBE (optional — call on logout)
// ============================================================================

async function unsubscribePushNotifications() {
    if (!('serviceWorker' in navigator)) return;

    const token = localStorage.getItem('fsh_token');

    try {
        const registration   = await navigator.serviceWorker.ready;
        const subscription   = await registration.pushManager.getSubscription();

        if (subscription) {
            // Tell server to remove it
            if (token) {
                await fetch(`${PUSH_API_BASE}/api/push/unsubscribe`, {
                    method:  'DELETE',
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });
            }
            await subscription.unsubscribe();
        }
    } catch (err) {
        console.error('Unsubscribe failed:', err);
    }
}

// ============================================================================
// UTILITY
// ============================================================================

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ============================================================================
// AUTO-INIT on DOMContentLoaded
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Small delay to let auth complete first
    setTimeout(initPushNotifications, 1000);
});

// Expose for manual call and logout cleanup
window.initPushNotifications       = initPushNotifications;
window.unsubscribePushNotifications = unsubscribePushNotifications;
