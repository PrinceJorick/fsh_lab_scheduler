// ============================================================================
// MAIL.JS - Mail Page Management
// ============================================================================

let currentFilter = 'all';
let currentMessageId = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const email = localStorage.getItem('fsh_user_email');
    const role = localStorage.getItem('fsh_user_role');
    
    if (!email) {
        window.location.href = 'index.html';
        return;
    }
    
    // Update user display
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        const userName = email.split('@')[0];
        userDisplay.innerText = `${userName} (${role})`;
    }
    
    // Update subtitle based on role
    const subtitle = document.getElementById('mail-subtitle');
    if (subtitle) {
        if (role === 'Admin') {
            subtitle.textContent = 'Laboratory reservation requests';
        } else {
            subtitle.textContent = 'Your reservation status updates';
        }
    }
    
    // Load messages
    loadMessages();
    
    // Update badge
    updateNotificationBadge();
});

// ============================================================================
// LOAD MESSAGES
// ============================================================================

function loadMessages() {
    const email = localStorage.getItem('fsh_user_email');
    const role = localStorage.getItem('fsh_user_role');
    
    // Sync notification statuses with reservation statuses before loading
    syncNotificationStatuses();
    
    let notifications = getUserNotifications(email);
    
    // For teachers, also include their pending reservations
    if (role === 'Teacher') {
        const pendingReservations = getPendingReservationsForTeacher(email);
        
        // Convert pending reservations to notification format
        const reservationNotifications = pendingReservations.map(res => ({
            id: `res_${res.id}`, // Prefix to distinguish from regular notifications
            type: 'reservation',
            reservationId: res.id,
            from: email,
            to: email,
            subject: `Pending: ${res.lab}`,
            message: `Your reservation for ${res.lab} is pending approval`,
            lab: res.lab,
            date: res.date,
            timeSlot: res.timeSlot,
            status: 'pending',
            read: true, // Mark as read since they created it
            createdAt: res.createdAt,
            teacherName: res.teacherName,
            subject: res.subject,
            grade: res.grade,
            students: res.students,
            purpose: res.purpose
        }));
        
        // Combine notifications and pending reservations
        notifications = [...notifications, ...reservationNotifications];
    }
    
    // Sort: pending first, then by creation date (newest first)
    // This applies to both teachers and admins
    notifications.sort((a, b) => {
        // Pending items always come first
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        // Within same status, sort by date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Update counts
    updateCounts(notifications);
    
    // Filter messages
    const filtered = filterNotifications(notifications, currentFilter);
    
    // Render messages
    renderMessages(filtered);
}

function getPendingReservationsForTeacher(email) {
    const reservations = getAllReservations();
    return reservations.filter(r => 
        r.requester === email && 
        r.status === 'pending'
    );
}

function syncNotificationStatuses() {
    // Get all notifications and reservations
    const notifications = getAllNotifications();
    const reservations = getAllReservations();
    let updated = false;
    
    // Create a map of reservationId to status for quick lookup
    const reservationStatusMap = {};
    reservations.forEach(res => {
        reservationStatusMap[res.id] = res.status === 'declined' ? 'rejected' : res.status;
    });
    
    // Update notification statuses to match reservation statuses
    notifications.forEach(notification => {
        if (notification.type === 'request' && notification.reservationId) {
            const reservationStatus = reservationStatusMap[notification.reservationId];
            if (reservationStatus && notification.status !== reservationStatus) {
                notification.status = reservationStatus;
                updated = true;
            }
        }
    });
    
    // Save if any updates were made
    if (updated) {
        localStorage.setItem('fsh_notifications', JSON.stringify(notifications));
    }
}

function updateCounts(notifications) {
    const counts = {
        all: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        approved: notifications.filter(n => n.status === 'approved').length,
        pending: notifications.filter(n => n.status === 'pending').length
    };
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-unread').textContent = counts.unread;
    document.getElementById('count-approved').textContent = counts.approved;
    document.getElementById('count-pending').textContent = counts.pending;
}

function filterNotifications(notifications, filter) {
    switch(filter) {
        case 'unread':
            return notifications.filter(n => !n.read);
        case 'approved':
            return notifications.filter(n => n.status === 'approved');
        case 'pending':
            return notifications.filter(n => n.status === 'pending');
        default:
            return notifications;
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
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    notifications.forEach(notification => {
        const messageElement = createMessageElement(notification);
        container.appendChild(messageElement);
    });
}

function createMessageElement(notification) {
    const div = document.createElement('div');
    div.className = `message-item ${notification.status}`;
    if (!notification.read) {
        div.classList.add('unread');
    }
    
    const role = localStorage.getItem('fsh_user_role');
    const fromName = notification.from.split('@')[0];
    
    // Format time
    const timeAgo = getTimeAgo(notification.createdAt);
    
    div.innerHTML = `
        <div class="message-header">
            <div class="message-title">
                <h3>${notification.subject}</h3>
                ${notification.status === 'pending' && notification.type === 'reservation' ? `<span class="message-badge pending">pending</span>` : ''}
                ${notification.status !== 'pending' ? `<span class="message-badge ${notification.status}">${notification.status}</span>` : ''}
            </div>
            <span class="message-time">${timeAgo}</span>
        </div>
        <div class="message-preview">
            ${notification.type === 'request' ? `<strong>From: ${fromName}</strong> - ` : ''}${notification.message}
        </div>
        <div class="message-meta">
            <div class="message-meta-item">
                <i class="fas fa-flask"></i>
                <span>${notification.lab}</span>
            </div>
            <div class="message-meta-item">
                <i class="far fa-calendar"></i>
                <span>${formatDate(notification.date)}</span>
            </div>
            <div class="message-meta-item">
                <i class="far fa-clock"></i>
                <span>${notification.timeSlot}</span>
            </div>
        </div>
        ${!notification.read ? '<div class="unread-indicator"></div>' : ''}
    `;
    
    div.onclick = () => openMessage(notification);
    
    return div;
}

// ============================================================================
// MESSAGE DETAIL MODAL
// ============================================================================

function openMessage(notification) {
    currentMessageId = notification.id;
    
    // Mark as read
    if (!notification.read) {
        markAsRead(notification.id);
        loadMessages(); // Reload to update UI
    }
    
    // Get reservation details
    const reservation = getReservationById(notification.reservationId);
    const role = localStorage.getItem('fsh_user_role');
    
    // Check for status mismatch and sync
    if (reservation && reservation.status !== notification.status) {
        // Sync notification status with reservation status
        // Map 'declined' to 'rejected' for notifications
        notification.status = reservation.status === 'declined' ? 'rejected' : reservation.status;
        saveNotificationUpdate(notification);
    }
    
    const detailContainer = document.getElementById('message-detail');
    
    let actionsHtml = '';
    
    // Show approve/reject buttons for admins on pending requests
    if (role === 'Admin' && notification.type === 'request' && notification.status === 'pending' && reservation && reservation.status === 'pending') {
        actionsHtml = `
            <div class="message-actions">
                <button class="action-btn view-lab" onclick="viewScheduleInLaboratory('${notification.lab}', '${reservation.date}', '${reservation.timeSlot}')">
                    <i class="fas fa-calendar-alt"></i> View Schedule
                </button>
            </div>
            <div class="message-actions">
                <button class="action-btn approve" onclick="approveReservationFromMail('${notification.reservationId}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="action-btn reject" onclick="rejectReservationFromMail('${notification.reservationId}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        `;
    } else if (role === 'Admin' && notification.type === 'request') {
        // For non-pending requests, just show view schedule button
        actionsHtml = `
            <div class="message-actions">
                <button class="action-btn view-lab" onclick="viewScheduleInLaboratory('${notification.lab}', '${reservation ? reservation.date : ''}', '${reservation ? reservation.timeSlot : ''}')">
                    <i class="fas fa-calendar-alt"></i> View Schedule
                </button>
            </div>
        `;
    } else if (role !== 'Admin' && notification.type === 'approval' && reservation) {
        // For teachers viewing approval notifications, show view schedule button
        actionsHtml = `
            <div class="message-actions">
                <button class="action-btn view-lab" onclick="viewScheduleInLaboratory('${notification.lab}', '${reservation.date}', '${reservation.timeSlot}')">
                    <i class="fas fa-calendar-alt"></i> View Schedule
                </button>
            </div>
        `;
    } else if (role !== 'Admin' && notification.type === 'reservation' && reservation) {
        // For teachers viewing their pending reservations
        actionsHtml = `
            <div class="message-actions">
                <button class="action-btn view-lab" onclick="viewScheduleInLaboratory('${notification.lab}', '${reservation.date}', '${reservation.timeSlot}')">
                    <i class="fas fa-calendar-alt"></i> View Schedule
                </button>
            </div>
        `;
    }
    
    detailContainer.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">Subject</div>
            <div class="detail-value">${notification.subject}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Message</div>
            <div class="detail-value">${notification.message}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">From</div>
            <div class="detail-value">${notification.from}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-label">Status</div>
            <div class="detail-value">
                <span class="message-badge ${notification.status}">${notification.status}</span>
            </div>
        </div>
        
        ${reservation ? `
            <div class="detail-section">
                <div class="detail-label">Reservation Details</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-item-label">Laboratory</div>
                        <div class="detail-item-value">${reservation.lab}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Date</div>
                        <div class="detail-item-value">${formatDate(reservation.date)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Time Slot</div>
                        <div class="detail-item-value">${reservation.timeSlot}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Subject</div>
                        <div class="detail-item-value">${reservation.subject}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Grade Level</div>
                        <div class="detail-item-value">Grade ${reservation.grade}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Students</div>
                        <div class="detail-item-value">${reservation.students}</div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Purpose/Activity</div>
                <div class="detail-value">${reservation.purpose}</div>
            </div>
        ` : ''}
        
        ${actionsHtml}
    `;
    
    // Show modal
    document.getElementById('message-modal').style.display = 'flex';
}

function closeMessageModal() {
    document.getElementById('message-modal').style.display = 'none';
    currentMessageId = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('message-modal');
    if (event.target === modal) {
        closeMessageModal();
    }
}

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

function approveReservationFromMail(reservationId) {
    if (!confirm('Approve this reservation?')) {
        return;
    }
    
    // Get reservation
    const reservation = getReservationById(reservationId);
    if (!reservation) {
        alert('Reservation not found');
        return;
    }
    
    // Update reservation status
    reservation.status = 'approved';
    updateReservation(reservation);
    
    // Send notification to teacher
    sendApprovalNotification(reservation, true);
    
    // Update ALL notifications related to this reservation
    updateAllNotificationsForReservation(reservationId, 'approved');
    
    // Show success
    alert('Reservation approved! Teacher has been notified.');
    
    // Close modal and reload
    closeMessageModal();
    loadMessages();
}

function rejectReservationFromMail(reservationId) {
    if (!confirm('Reject this reservation?')) {
        return;
    }
    
    // Get reservation
    const reservation = getReservationById(reservationId);
    if (!reservation) {
        alert('Reservation not found');
        return;
    }
    
    // Update reservation status (using 'declined' to match laboratory.js)
    reservation.status = 'declined';
    updateReservation(reservation);
    
    // Send notification to teacher
    sendApprovalNotification(reservation, false);
    
    // Update ALL notifications related to this reservation
    updateAllNotificationsForReservation(reservationId, 'rejected');
    
    // Show success
    alert('Reservation rejected. Teacher has been notified.');
    
    // Close modal and reload
    closeMessageModal();
    loadMessages();
}

function updateAllNotificationsForReservation(reservationId, newStatus) {
    const notifications = getAllNotifications();
    let updated = false;
    
    notifications.forEach(notification => {
        if (notification.reservationId === reservationId && notification.type === 'request') {
            notification.status = newStatus;
            updated = true;
        }
    });
    
    if (updated) {
        localStorage.setItem('fsh_notifications', JSON.stringify(notifications));
    }
}

function saveNotificationUpdate(notification) {
    const notifications = getAllNotifications();
    const index = notifications.findIndex(n => n.id === notification.id);
    if (index !== -1) {
        notifications[index] = notification;
        localStorage.setItem('fsh_notifications', JSON.stringify(notifications));
    }
}

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

function filterMessages(filter) {
    currentFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.mail-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    
    // Reload messages
    loadMessages();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getReservationById(id) {
    const reservations = getAllReservations();
    return reservations.find(r => r.id === id);
}

function getAllReservations() {
    const data = localStorage.getItem('fsh_reservations');
    return data ? JSON.parse(data) : [];
}

function updateReservation(reservation) {
    const reservations = getAllReservations();
    const index = reservations.findIndex(r => r.id === reservation.id);
    
    if (index !== -1) {
        reservations[index] = reservation;
        localStorage.setItem('fsh_reservations', JSON.stringify(reservations));
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return formatDate(dateString);
}

function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

function viewInLaboratory(labName) {
    // Close the modal
    closeMessageModal();
    
    // Redirect to laboratory page with lab name
    window.location.href = `laboratory.html?lab=${encodeURIComponent(labName)}`;
}

function viewScheduleInLaboratory(labName, date, timeSlot) {
    // Close the modal
    closeMessageModal();
    
    // Redirect to laboratory page with lab name, date, and time slot
    const params = new URLSearchParams({
        lab: labName,
        date: date,
        timeSlot: timeSlot,
        fromMail: 'true'
    });
    
    window.location.href = `laboratory.html?${params.toString()}`;
}

// Make functions globally available
window.filterMessages = filterMessages;
window.openMessage = openMessage;
window.closeMessageModal = closeMessageModal;
window.approveReservationFromMail = approveReservationFromMail;
window.rejectReservationFromMail = rejectReservationFromMail;
window.goBackToDashboard = goBackToDashboard;
window.viewInLaboratory = viewInLaboratory;
window.viewScheduleInLaboratory = viewScheduleInLaboratory;