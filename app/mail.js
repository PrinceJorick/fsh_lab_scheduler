// ============================================================================
// MAIL.JS - Notifications / Mail Page
// Loads from Worker API with 5-second polling for real-time updates
// ============================================================================

const MAIL_API_BASE = 'https://fsh-scheduler.medranowilljairuz.workers.dev';

let currentFilter      = 'all';
let currentMessageId   = null;
let mailPollingInterval = null;
let allNotifications   = [];

// ============================================================================
// API HELPER
// ============================================================================

function mailGetToken() { return localStorage.getItem('fsh_token'); }

async function mailApiCall(endpoint, method = 'GET', body = null) {
    const token   = mailGetToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${MAIL_API_BASE}${endpoint}`, options);
    return res.json();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const email = localStorage.getItem('fsh_user_email');
    const role  = localStorage.getItem('fsh_user_role');

    if (!email) { window.location.href = 'index.html'; return; }

    // Update user display
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.innerText = `${email.split('@')[0]} (${role})`;

    // Update subtitle
    const subtitle = document.getElementById('mail-subtitle');
    if (subtitle) {
        subtitle.textContent = role === 'Admin'
            ? 'Laboratory reservation requests'
            : 'Your reservation status updates';
    }

    // Initial load
    await loadMessages();

    // Poll every 5 seconds
    mailPollingInterval = setInterval(loadMessages, 5000);

    window.addEventListener('beforeunload', () => {
        if (mailPollingInterval) clearInterval(mailPollingInterval);
    });
});

// ============================================================================
// LOAD MESSAGES
// ============================================================================

async function loadMessages() {
    try {
        const data = await mailApiCall('/api/notifications');
        if (!data.success) return;

        allNotifications = data.notifications || [];

        updateCounts(allNotifications);
        const filtered = filterNotifications(allNotifications, currentFilter);
        renderMessages(filtered);
        updateNotificationBadge();

    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

function updateCounts(notifications) {
    document.getElementById('count-all').textContent     = notifications.length;
    document.getElementById('count-unread').textContent  = notifications.filter(n => !n.read).length;
    document.getElementById('count-approved').textContent = notifications.filter(n => n.status === 'approved').length;
    document.getElementById('count-pending').textContent  = notifications.filter(n => n.status === 'pending').length;
}

function filterNotifications(notifications, filter) {
    switch (filter) {
        case 'unread':   return notifications.filter(n => !n.read);
        case 'approved': return notifications.filter(n => n.status === 'approved');
        case 'pending':  return notifications.filter(n => n.status === 'pending');
        default:         return notifications;
    }
}

// ============================================================================
// RENDER MESSAGES
// ============================================================================

function renderMessages(notifications) {
    const container = document.getElementById('messages-list');

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No messages to display</p>
            </div>`;
        return;
    }

    container.innerHTML = '';
    notifications.forEach(n => container.appendChild(createMessageElement(n)));
}

function createMessageElement(notification) {
    const div      = document.createElement('div');
    div.className  = `message-item ${notification.status}`;
    if (!notification.read) div.classList.add('unread');

    const fromName = notification.from.split('@')[0];
    const timeAgo  = getTimeAgo(notification.createdAt);

    div.innerHTML = `
        <div class="message-header">
            <div class="message-title">
                <h3>${notification.subject}</h3>
                <span class="message-badge ${notification.status}">${notification.status}</span>
            </div>
            <span class="message-time">${timeAgo}</span>
        </div>
        <div class="message-preview">
            ${notification.type === 'request' ? `<strong>From: ${fromName}</strong> — ` : ''}${notification.message}
        </div>
        <div class="message-meta">
            <div class="message-meta-item"><i class="fas fa-flask"></i><span>${notification.lab}</span></div>
            <div class="message-meta-item"><i class="far fa-calendar"></i><span>${formatDate(notification.date)}</span></div>
            <div class="message-meta-item"><i class="far fa-clock"></i><span>${notification.timeSlot}</span></div>
        </div>
        ${!notification.read ? '<div class="unread-indicator"></div>' : ''}
    `;

    div.onclick = () => openMessage(notification.id);
    return div;
}

// ============================================================================
// OPEN MESSAGE MODAL
// ============================================================================

async function openMessage(notificationId) {
    currentMessageId = notificationId;

    // Mark as read on server
    await mailApiCall(`/api/notifications/${notificationId}/read`, 'PATCH');

    // Update locally so badge refreshes immediately
    const notif = allNotifications.find(n => n.id === notificationId);
    if (notif) notif.read = true;
    updateNotificationBadge();

    // Find the notification
    if (!notif) { alert('Notification not found.'); return; }

    const role         = localStorage.getItem('fsh_user_role');
    const detailEl     = document.getElementById('message-detail');
    const fromName     = notif.from.split('@')[0];
    const isAdmin      = role === 'Admin';
    const isPending    = notif.status === 'pending' && notif.type === 'request';

    // Fetch full reservation details if needed
    let reservationDetails = '';
    if (notif.reservationId) {
        try {
            const resData = await mailApiCall(`/api/reservations?lab=${encodeURIComponent(notif.lab)}`);
            if (resData.success) {
                const res = resData.reservations.find(r => r.id === notif.reservationId);
                if (res) {
                    reservationDetails = `
                        <div class="detail-section">
                            <div class="detail-label">Reservation Details</div>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <div class="detail-item-label">Teacher</div>
                                    <div class="detail-item-value">${res.teacherName}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-item-label">Date</div>
                                    <div class="detail-item-value">${formatDate(res.date)}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-item-label">Time Slot</div>
                                    <div class="detail-item-value">${res.timeSlot}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-item-label">Subject</div>
                                    <div class="detail-item-value">${res.subject}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-item-label">Grade Level</div>
                                    <div class="detail-item-value">Grade ${res.grade}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-item-label">Students</div>
                                    <div class="detail-item-value">${res.students}</div>
                                </div>
                            </div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">Purpose / Activity</div>
                            <div class="detail-value">${res.purpose}</div>
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error('Failed to load reservation details:', err);
        }
    }

    // Admin action buttons for pending requests
    const adminActions = isAdmin && isPending ? `
        <div class="message-actions">
            <button class="action-btn approve" onclick="approveReservationFromMail('${notif.reservationId}')">
                <i class="fas fa-check"></i> Approve
            </button>
            <button class="action-btn reject" onclick="rejectReservationFromMail('${notif.reservationId}')">
                <i class="fas fa-times"></i> Decline
            </button>
        </div>
    ` : '';

    // View in lab button
    const viewLabBtn = `
        <div class="message-actions">
            <button class="action-btn view-lab" onclick="viewScheduleInLaboratory('${notif.lab}', '${notif.date}', '${notif.timeSlot}')">
                <i class="fas fa-flask"></i> View in Laboratory
            </button>
        </div>
    `;

    detailEl.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">Subject</div>
            <div class="detail-value" style="font-size:18px; font-weight:600;">${notif.subject}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Message</div>
            <div class="detail-value">${notif.message}</div>
        </div>
        <div class="detail-section">
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-item-label">Laboratory</div>
                    <div class="detail-item-value">${notif.lab}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label">Date</div>
                    <div class="detail-item-value">${formatDate(notif.date)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label">Time Slot</div>
                    <div class="detail-item-value">${notif.timeSlot}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-item-label">Status</div>
                    <div class="detail-item-value">
                        <span class="message-badge ${notif.status}">${notif.status}</span>
                    </div>
                </div>
            </div>
        </div>
        ${reservationDetails}
        ${adminActions}
        ${viewLabBtn}
    `;

    document.getElementById('message-modal').style.display = 'flex';
}

function closeMessageModal() {
    document.getElementById('message-modal').style.display = 'none';
    currentMessageId = null;
}

window.onclick = function(event) {
    const modal = document.getElementById('message-modal');
    if (event.target === modal) closeMessageModal();
};

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

async function approveReservationFromMail(reservationId) {
    if (!confirm('Approve this reservation?')) return;

    try {
        const data = await mailApiCall(`/api/reservations/${reservationId}`, 'PATCH', { status: 'approved' });
        if (!data.success) { alert(data.message); return; }

        alert('✅ Reservation approved! Teacher has been notified.');
        closeMessageModal();
        await loadMessages();

    } catch (err) {
        alert('Could not reach the server. Please try again.');
        console.error(err);
    }
}

async function rejectReservationFromMail(reservationId) {
    if (!confirm('Decline this reservation?')) return;

    try {
        const data = await mailApiCall(`/api/reservations/${reservationId}`, 'PATCH', { status: 'declined' });
        if (!data.success) { alert(data.message); return; }

        alert('❌ Reservation declined. Teacher has been notified.');
        closeMessageModal();
        await loadMessages();

    } catch (err) {
        alert('Could not reach the server. Please try again.');
        console.error(err);
    }
}

// ============================================================================
// FILTER
// ============================================================================

function filterMessages(filter) {
    currentFilter = filter;

    document.querySelectorAll('.mail-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');

    const filtered = filterNotifications(allNotifications, filter);
    renderMessages(filtered);
}

// ============================================================================
// UTILITY
// ============================================================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

function getTimeAgo(dateString) {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60)     return 'Just now';
    if (seconds < 3600)   return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400)  return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(dateString);
}

function goBackToDashboard() { window.location.href = 'dashboard.html'; }

function viewScheduleInLaboratory(labName, date, timeSlot) {
    closeMessageModal();
    const params = new URLSearchParams({ lab: labName, date, timeSlot, fromMail: 'true' });
    window.location.href = `laboratory.html?${params.toString()}`;
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.filterMessages             = filterMessages;
window.openMessage                = openMessage;
window.closeMessageModal          = closeMessageModal;
window.approveReservationFromMail = approveReservationFromMail;
window.rejectReservationFromMail  = rejectReservationFromMail;
window.goBackToDashboard          = goBackToDashboard;
window.viewScheduleInLaboratory   = viewScheduleInLaboratory;