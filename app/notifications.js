// ============================================================================
// NOTIFICATIONS.JS - Notification Management System
// ============================================================================

// ============================================================================
// NOTIFICATION CREATION
// ============================================================================

function createNotification(data) {
    const notification = {
        id: Date.now().toString(),
        type: data.type, // 'request' or 'approval'
        reservationId: data.reservationId,
        from: data.from,
        to: data.to,
        subject: data.subject || '',
        message: data.message,
        lab: data.lab || '',
        date: data.date || '',
        timeSlot: data.timeSlot || '',
        status: data.status || 'pending',
        read: false,
        createdAt: new Date().toISOString()
    };
    
    // Save notification
    saveNotification(notification);
    
    // Show push notification
    showPushNotification(notification);
    
    // Update badge count
    updateNotificationBadge();
    
    return notification;
}

// ============================================================================
// NOTIFICATION STORAGE
// ============================================================================

function saveNotification(notification) {
    const notifications = getAllNotifications();
    notifications.push(notification);
    localStorage.setItem('fsh_notifications', JSON.stringify(notifications));
}

function getAllNotifications() {
    const data = localStorage.getItem('fsh_notifications');
    return data ? JSON.parse(data) : [];
}

function getNotificationById(id) {
    const notifications = getAllNotifications();
    return notifications.find(n => n.id === id);
}

function getUserNotifications(userEmail) {
    const notifications = getAllNotifications();
    return notifications.filter(n => n.to === userEmail)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markAsRead(notificationId) {
    const notifications = getAllNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification) {
        notification.read = true;
        localStorage.setItem('fsh_notifications', JSON.stringify(notifications));
        updateNotificationBadge();
    }
}

function getUnreadCount(userEmail) {
    const notifications = getUserNotifications(userEmail);
    return notifications.filter(n => !n.read).length;
}

// ============================================================================
// NOTIFICATION BADGE
// ============================================================================

function updateNotificationBadge() {
    const email = localStorage.getItem('fsh_user_email');
    if (!email) return;
    
    const unreadCount = getUnreadCount(email);
    const badge = document.getElementById('notification-badge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

function showPushNotification(notification) {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        // Show in-app toast instead
        showToastNotification(notification);
        return;
    }
    
    // Check if permission is granted
    if (Notification.permission === "granted") {
        displayNotification(notification);
        showToastNotification(notification); // Also show toast for immediate feedback
    } 
    // Otherwise, ask for permission
    else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function(permission) {
            if (permission === "granted") {
                displayNotification(notification);
                showToastNotification(notification);
            } else {
                // Permission denied, show toast only
                showToastNotification(notification);
            }
        });
    } else {
        // Permission denied, show toast only
        showToastNotification(notification);
    }
}

// In-app toast notification
function showToastNotification(notification) {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    
    let icon = '';
    let title = '';
    let message = '';
    let bgColor = '';
    
    if (notification.type === 'request') {
        icon = '📬';
        title = 'New Reservation Request';
        message = `${notification.from.split('@')[0]} requested ${notification.lab}`;
        bgColor = '#081316';
    } else if (notification.type === 'approval') {
        if (notification.status === 'approved') {
            icon = '✅';
            title = 'Reservation Approved!';
            message = `Your ${notification.lab} reservation has been approved`;
            bgColor = '#22c55e';
        } else if (notification.status === 'rejected') {
            icon = '❌';
            title = 'Reservation Not Approved';
            message = `Your ${notification.lab} reservation was not approved`;
            bgColor = '#ef4444';
        }
    }
    
    toast.style.cssText = `
        background: ${bgColor};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        animation: slideInRight 0.3s ease;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        min-width: 320px;
    `;
    
    toast.innerHTML = `
        <div style="font-size: 24px; flex-shrink: 0;">${icon}</div>
        <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 13px; opacity: 0.95;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">×</button>
    `;
    
    toast.onclick = function(e) {
        if (e.target.tagName !== 'BUTTON') {
            window.location.href = 'mail.html';
        }
    };
    
    container.appendChild(toast);
    
    // Add slide in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        .notification-toast:hover {
            transform: translateX(-5px);
            transition: transform 0.2s ease;
        }
    `;
    if (!document.getElementById('toast-styles')) {
        style.id = 'toast-styles';
        document.head.appendChild(style);
    }
    
    // Auto remove after 7 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 7000);
}

function displayNotification(notification) {
    let title = '';
    let body = '';
    let icon = '../public/fsh_logo_colored.png';
    
    if (notification.type === 'request') {
        title = '📬 New Lab Reservation Request';
        const fromName = notification.from.split('@')[0];
        body = `${fromName} requested ${notification.lab}\n📅 ${formatNotificationDate(notification.date)}\n🕐 ${notification.timeSlot}`;
    } else if (notification.type === 'approval') {
        if (notification.status === 'approved') {
            title = '✅ Reservation Approved!';
            body = `Your ${notification.lab} reservation has been approved!\n📅 ${formatNotificationDate(notification.date)}\n🕐 ${notification.timeSlot}`;
        } else if (notification.status === 'rejected') {
            title = '❌ Reservation Not Approved';
            body = `Your ${notification.lab} reservation was not approved.\n📅 ${formatNotificationDate(notification.date)}\n🕐 ${notification.timeSlot}\n\nPlease try a different time slot.`;
        }
    }
    
    const notif = new Notification(title, {
        body: body,
        icon: icon,
        badge: icon,
        tag: notification.id,
        requireInteraction: false
    });
    
    notif.onclick = function() {
        window.focus();
        window.location.href = 'mail.html';
        notif.close();
    };
    
    // Auto close after 7 seconds
    setTimeout(() => notif.close(), 7000);
}

function formatNotificationDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Request notification permission on page load
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

// ============================================================================
// ADMIN NOTIFICATIONS (when teacher submits request)
// ============================================================================

function sendAdminNotification(reservationData) {
    // Get all admin users
    const admins = getAllAdmins();
    
    admins.forEach(adminEmail => {
        createNotification({
            type: 'request',
            reservationId: reservationData.id,
            from: reservationData.requester,
            to: adminEmail,
            subject: `New Lab Request: ${reservationData.lab}`,
            message: `${reservationData.requester.split('@')[0]} has requested ${reservationData.lab} for ${reservationData.subject} class.`,
            lab: reservationData.lab,
            date: reservationData.date,
            timeSlot: reservationData.timeSlot,
            status: 'pending'
        });
    });
}

// ============================================================================
// TEACHER NOTIFICATIONS (when admin approves/rejects)
// ============================================================================

function sendApprovalNotification(reservationData, approved = true) {
    const status = approved ? 'approved' : 'rejected';
    const message = approved 
        ? `Your reservation for ${reservationData.lab} on ${reservationData.date} (${reservationData.timeSlot}) has been approved!`
        : `Your reservation for ${reservationData.lab} on ${reservationData.date} (${reservationData.timeSlot}) was not approved. Please try a different time slot.`;
    
    createNotification({
        type: 'approval',
        reservationId: reservationData.id,
        from: localStorage.getItem('fsh_user_email') || 'admin',
        to: reservationData.requester,
        subject: approved ? 'Reservation Approved' : 'Reservation Not Approved',
        message: message,
        lab: reservationData.lab,
        date: reservationData.date,
        timeSlot: reservationData.timeSlot,
        status: status
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getAllAdmins() {
    // Get all users with admin role
    const admins = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_')) {
            const userData = JSON.parse(localStorage.getItem(key));
            if (userData.role === 'Admin') {
                admins.push(userData.email);
            }
        }
    }
    
    return admins;
}

function deleteNotification(notificationId) {
    const notifications = getAllNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem('fsh_notifications', JSON.stringify(filtered));
    updateNotificationBadge();
}

function clearAllNotifications(userEmail) {
    const notifications = getAllNotifications();
    const filtered = notifications.filter(n => n.to !== userEmail);
    localStorage.setItem('fsh_notifications', JSON.stringify(filtered));
    updateNotificationBadge();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    requestNotificationPermission();
    
    // Update badge on page load
    updateNotificationBadge();
});

// Make functions globally available
window.createNotification = createNotification;
window.sendAdminNotification = sendAdminNotification;
window.sendApprovalNotification = sendApprovalNotification;
window.getUserNotifications = getUserNotifications;
window.markAsRead = markAsRead;
window.getUnreadCount = getUnreadCount;
window.updateNotificationBadge = updateNotificationBadge;
window.deleteNotification = deleteNotification;
window.clearAllNotifications = clearAllNotifications;
