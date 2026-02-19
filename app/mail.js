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

    // Edit button for teachers on their own pending/approved reservations.
    // Teachers only receive notifications about their own reservations, so no
    // extra email ownership check is needed beyond the role check.
    const isTeacher = !isAdmin;
    const canTeacherEdit = isTeacher && notif.reservationId &&
        (notif.status === 'pending' || notif.status === 'approved');

    const editBtn = canTeacherEdit ? `
        <div class="message-actions" style="flex-direction:column; gap:0;">
            <button class="action-btn view-lab" onclick="openEditModalFromMail('${notif.reservationId}', '${notif.lab}')"
                style="background:var(--text-color); color:var(--bg-color); border-color:var(--text-color); ${notif.status === 'approved' ? 'border-radius:50px 50px 0 0;' : ''}">
                <i class="fas fa-edit"></i> Edit Reservation
            </button>
            ${notif.status === 'approved' ? `
            <div style="background:rgba(245,158,11,0.15); border:1px solid #f59e0b; border-top:none; border-radius:0 0 12px 12px;
                padding:8px 14px; font-size:13px; color:#d97706; display:flex; gap:8px; align-items:center;">
                <i class="fas fa-exclamation-triangle" style="flex-shrink:0;"></i>
                Editing will reset status to <strong style="margin-left:3px;">pending</strong> and require re-approval.
            </div>` : ''}
        </div>
    ` : '';

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
        ${editBtn}
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
    // Ensure timestamp is treated as UTC (append Z if no timezone info present)
    const utcString = dateString && !dateString.endsWith('Z') && !dateString.includes('+') ? dateString + 'Z' : dateString;
    const seconds = Math.floor((new Date() - new Date(utcString)) / 1000);
    if (seconds < 60)     return 'Just now';
    if (seconds < 3600)   return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400)  return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(dateString);
}

const TIME_SLOTS_MAIL = [
    '07:00 AM - 08:00 AM','08:00 AM - 09:00 AM','09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM','11:00 AM - 12:00 PM','01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM','03:00 PM - 04:00 PM','04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM'
];

async function openEditModalFromMail(reservationId, labName) {
    // Fetch the reservation data first
    let r = null;
    try {
        const data = await mailApiCall(`/api/reservations?lab=${encodeURIComponent(labName)}`);
        if (data.success) r = data.reservations.find(res => res.id === reservationId);
    } catch (err) { console.error(err); }

    if (!r) { alert('Could not load reservation data.'); return; }

    closeMessageModal();
    document.getElementById('mail-edit-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'mail-edit-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; box-sizing: border-box;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--card-bg); border-radius: 20px; width: 100%;
            max-width: 480px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            overflow-y: auto; max-height: 90vh; margin: auto;
        ">
            <div style="
                background: linear-gradient(135deg, #081316 0%, #2a3a3f 100%);
                padding: 20px 25px;
                display: flex; justify-content: space-between; align-items: center;
            ">
                <h2 style="color:white; margin:0; font-size:1.1rem; font-weight:600;">
                    <i class="fas fa-edit" style="margin-right:8px;"></i>Edit Reservation
                </h2>
                <button onclick="closeMailEditModal()" style="
                    background: rgba(255,255,255,0.2); border: none; color: white;
                    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
                    font-size: 14px; display: flex; align-items: center; justify-content: center;
                "><i class="fas fa-times"></i></button>
            </div>
            <form id="mail-edit-form" style="padding: 20px; display:flex; flex-direction:column; gap:14px;">
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Date</label>
                    <input type="date" id="mail-edit-date" class="login-input" value="${r.date}" required
                        min="${new Date().toISOString().split('T')[0]}" style="margin:0;">
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Time Slot</label>
                    <select id="mail-edit-timeslot" class="login-input" required style="margin:0;">
                        ${TIME_SLOTS_MAIL.map(s => `<option value="${s}" ${s === r.timeSlot ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Teacher's Name</label>
                    <input type="text" id="mail-edit-teacher" class="login-input" value="${r.teacherName || ''}" required style="margin:0;">
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Subject</label>
                    <select id="mail-edit-subject" class="login-input" required style="margin:0;">
                        <option value="">Select subject</option>
                        ${['General Biology','Physics','Chemistry','ETECH'].map(s =>
                            `<option value="${s}" ${s === r.subject ? 'selected' : ''}>${s}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Grade Level</label>
                    <select id="mail-edit-grade" class="login-input" required style="margin:0;">
                        <option value="">Select grade</option>
                        <option value="11" ${r.grade == '11' ? 'selected' : ''}>Grade 11</option>
                        <option value="12" ${r.grade == '12' ? 'selected' : ''}>Grade 12</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Number of Students</label>
                    <input type="number" id="mail-edit-students" class="login-input" value="${r.students}" required min="1" max="50" style="margin:0;">
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Purpose / Activity</label>
                    <textarea id="mail-edit-purpose" class="login-input" required
                        style="margin:0; min-height:80px; resize:vertical; font-family:inherit;">${r.purpose}</textarea>
                </div>
                ${r.status === 'approved' ? `
                <div style="background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; border-radius:0 4px 4px 0;
                    padding:10px 14px; font-size:13px; color:#b45309; display:flex; gap:8px; align-items:flex-start;">
                    <i class="fas fa-exclamation-triangle" style="flex-shrink:0; margin-top:2px;"></i>
                    <span>Saving will reset this reservation to <strong>pending</strong> status and require admin re-approval.</span>
                </div>` : ''}
                <div style="display:flex; gap:10px; padding-top:4px;">
                    <button type="button" onclick="closeMailEditModal()" style="
                        flex:1; padding:11px; border-radius:50px; cursor:pointer;
                        background:transparent; color:var(--secondary-text);
                        border:1px solid var(--secondary-text); font-size:14px; font-weight:500;
                    ">Cancel</button>
                    <button type="submit" id="mail-edit-submit" style="
                        flex:1; padding:11px; border-radius:50px; cursor:pointer;
                        background:#081316; color:white; border:none;
                        font-size:14px; font-weight:500; display:flex;
                        align-items:center; justify-content:center; gap:8px;
                    "><i class="fas fa-save"></i> Save Changes</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    modal.addEventListener('click', e => { if (e.target === modal) closeMailEditModal(); });

    document.getElementById('mail-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('mail-edit-submit');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

        try {
            const data = await mailApiCall(`/api/reservations/${reservationId}`, 'PATCH', {
                date:        document.getElementById('mail-edit-date').value,
                timeSlot:    document.getElementById('mail-edit-timeslot').value,
                teacherName: document.getElementById('mail-edit-teacher').value,
                subject:     document.getElementById('mail-edit-subject').value,
                grade:       document.getElementById('mail-edit-grade').value,
                students:    document.getElementById('mail-edit-students').value,
                purpose:     document.getElementById('mail-edit-purpose').value,
                status:      'pending',
            });

            if (!data.success) { alert(data.message || 'Failed to update.'); return; }

            closeMailEditModal();
            await loadMessages();
            alert('✅ Reservation updated and resubmitted for approval!');
        } catch (err) {
            alert('Could not reach the server. Please try again.');
            console.error(err);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes'; }
        }
    });
}

function closeMailEditModal() {
    document.getElementById('mail-edit-modal')?.remove();
    document.body.style.overflow = '';
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
window.openEditModalFromMail      = openEditModalFromMail;
window.closeMailEditModal         = closeMailEditModal;