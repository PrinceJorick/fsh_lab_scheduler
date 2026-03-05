// ============================================================================
// NOTIFICATIONS.JS - Real-time Notification Management
// Polls the Worker API every 5 seconds for new notifications
// ============================================================================

const NOTIF_API_BASE = 'https://fsh-scheduler.medranowilljairuz.workers.dev';

let notifPollingInterval = null;

// Initialize lastUnreadCount from localStorage so we don't show toasts for old notifications
function getLastUnreadCount() {
    const stored = localStorage.getItem('fsh_last_unread_count');
    return stored ? parseInt(stored, 10) : -1; // -1 means "first time ever"
}

function setLastUnreadCount(count) {
    localStorage.setItem('fsh_last_unread_count', count.toString());
}

let lastUnreadCount = getLastUnreadCount();

// ============================================================================
// API HELPER
// ============================================================================

function notifGetToken() { return localStorage.getItem('fsh_token'); }

async function notifApiCall(endpoint, method = 'GET', body = null) {
    const token   = notifGetToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${NOTIF_API_BASE}${endpoint}`, options);
    return res.json();
}

// ============================================================================
// FETCH NOTIFICATIONS FROM SERVER
// ============================================================================

async function fetchNotificationsFromServer() {
    try {
        const data = await notifApiCall('/api/notifications');
        if (!data.success) return null;
        return data;
    } catch (err) {
        console.error('Failed to fetch notifications:', err);
        return null;
    }
}

// ============================================================================
// NOTIFICATION BADGE
// ============================================================================

async function updateNotificationBadge() {
    const token = notifGetToken();
    if (!token) return;

    try {
        const data = await notifApiCall('/api/notifications');
        if (!data.success) return;

        const unreadCount = data.unreadCount || 0;
        const badge       = document.getElementById('notification-badge');

        if (badge) {
            if (unreadCount > 0) {
                badge.textContent    = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display  = 'flex';
            } else {
                badge.style.display  = 'none';
            }
        }

        // Only show toast if count INCREASED and this isn't the first time checking
        if (unreadCount > lastUnreadCount && lastUnreadCount >= 0) {
            const newNotifs = data.notifications.filter(n => !n.read);
            // Only toast the newest unread notification to avoid spam
            if (newNotifs.length > 0) {
                showToastNotification(newNotifs[0]);
            }
        }

        lastUnreadCount = unreadCount;
        setLastUnreadCount(unreadCount); // ← Save to localStorage

    } catch (err) {
        console.error('Notification badge update failed:', err);
    }
}

// ============================================================================
// POLLING
// ============================================================================

function startNotificationPolling() {
    // Initial check
    updateNotificationBadge();

    // Poll every 5 seconds
    notifPollingInterval = setInterval(updateNotificationBadge, 5000);
}

function stopNotificationPolling() {
    if (notifPollingInterval) clearInterval(notifPollingInterval);
}

// ============================================================================
// MARK AS READ
// ============================================================================

async function markAsRead(notificationId) {
    try {
        await notifApiCall(`/api/notifications/${notificationId}/read`, 'PATCH');
        await updateNotificationBadge();
    } catch (err) {
        console.error('Failed to mark notification as read:', err);
    }
}

async function markAllAsRead() {
    try {
        await notifApiCall('/api/notifications/read-all', 'PATCH');
        await updateNotificationBadge();
    } catch (err) {
        console.error('Failed to mark all notifications as read:', err);
    }
}

// ============================================================================
// TOAST NOTIFICATION (in-app)
// ============================================================================

function showToastNotification(notification) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            display: flex; flex-direction: column; gap: 10px; max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'notification-toast';

    let icon    = '';
    let title   = '';
    let message = '';
    let bgColor = '';

    if (notification.type === 'request') {
        icon    = '📬';
        title   = 'New Reservation Request';
        message = `${notification.from.split('@')[0]} requested ${notification.lab}`;
        bgColor = '#081316';
    } else if (notification.type === 'approval') {
        if (notification.status === 'approved') {
            icon    = '✅';
            title   = 'Reservation Approved!';
            message = `Your ${notification.lab} reservation has been approved`;
            bgColor = '#22c55e';
        } else {
            icon    = '❌';
            title   = 'Reservation Not Approved';
            message = `Your ${notification.lab} reservation was not approved`;
            bgColor = '#ef4444';
        }
    }

    if (!title) return; // Don't show toast for unknown types

    toast.style.cssText = `
        background: ${bgColor}; color: white; padding: 16px 20px;
        border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        cursor: pointer; animation: slideInRight 0.3s ease;
        display: flex; gap: 12px; align-items: flex-start; min-width: 320px;
    `;

    toast.innerHTML = `
        <div style="font-size:24px; flex-shrink:0;">${icon}</div>
        <div style="flex:1;">
            <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${title}</div>
            <div style="font-size:13px; opacity:0.95;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="
            background: rgba(255,255,255,0.2); border: none; color: white;
            width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
            font-size: 16px; flex-shrink: 0; display: flex;
            align-items: center; justify-content: center;">×</button>
    `;

    toast.onclick = function(e) {
        if (e.target.tagName !== 'BUTTON') fshNavigate('mail.html');
    };

    container.appendChild(toast);

    // Add slide animation styles once
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id    = 'toast-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to   { transform: translateX(0);     opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0);     opacity: 1; }
                to   { transform: translateX(400px); opacity: 0; }
            }
            .notification-toast:hover { transform: translateX(-5px); transition: transform 0.2s ease; }
        `;
        document.head.appendChild(style);
    }

    // Auto-remove after 7 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 7000);
}


// ============================================================================
// INITIALIZATION
// ============================================================================

// Wait for badge element to be created before starting polling
function waitForBadgeAndStart() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        startNotificationPolling();
    } else {
        // Badge not ready yet, try again in 50ms
        setTimeout(waitForBadgeAndStart, 50);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = notifGetToken();
    if (token) {
        // Wait for mail button/badge to be created by sidebar-nav.js
        waitForBadgeAndStart();
    }
    
    window.addEventListener('beforeunload', stopNotificationPolling);
});

// ── Expose globals ────────────────────────────────────────────────────────────
window.updateNotificationBadge    = updateNotificationBadge;
window.markAsRead                 = markAsRead;
window.markAllAsRead              = markAllAsRead;
window.fetchNotificationsFromServer = fetchNotificationsFromServer;
window.showToastNotification      = showToastNotification;
window.startNotificationPolling   = startNotificationPolling;
window.stopNotificationPolling    = stopNotificationPolling;