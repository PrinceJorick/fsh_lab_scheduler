// ============================================================================
// LABORATORY.JS - Calendar & Reservation Management
// Uses Cloudflare Worker API for real-time sync across users
// ============================================================================

const API_BASE = 'https://fsh-scheduler.medranowilljairuz.workers.dev';

// Global state
let currentMonth    = new Date().getMonth();
let currentYear     = new Date().getFullYear();
let currentDay      = new Date();
let currentWeekStart = null;
let calendarView    = 'monthly';
let selectedDate    = null;
let selectedTimeSlot = null;
let currentLab      = '';
let reservationsCache = []; // local cache updated by polling
let pollingInterval = null;

// Time slots available for reservation
const TIME_SLOTS = [
    '07:00 AM - 08:00 AM',
    '08:00 AM - 09:00 AM',
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM',
    '04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM'
];

// ============================================================================
// API HELPER
// ============================================================================

function getToken() { return localStorage.getItem('fsh_token'); }

async function apiCall(endpoint, method = 'GET', body = null) {
    const token   = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    return res.json();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentLab = urlParams.get('lab') || 'Laboratory';

    document.title = `${currentLab} - FSH Lab Scheduler`;

    const email = localStorage.getItem('fsh_user_email');
    const role  = localStorage.getItem('fsh_user_role');

    if (!email) { fshNavigate('index.html'); return; }

    // Update user display
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.innerText = `${email.split('@')[0]} (${role})`;

    // Initial load
    await fetchReservations();

    // Initialize UI based on role
    if (role === 'Admin') {
        initializeAdminView();
    } else {
        initializeUserView();
    }

    showCalendarView('monthly');

    // Start polling every 5 seconds for real-time updates
    startPolling();

    // Handle redirect from mail page
    const fromMail    = urlParams.get('fromMail');
    const targetDate  = urlParams.get('date');
    const targetSlot  = urlParams.get('timeSlot');
    if (fromMail === 'true' && targetDate) {
        setTimeout(() => highlightDateFromMail(targetDate, targetSlot), 300);
    }
});

// ============================================================================
// POLLING — fetches reservations every 5s for real-time sync
// ============================================================================

function startPolling() {
    pollingInterval = setInterval(async () => {
        await fetchReservations();
        renderCalendar();

        const role = localStorage.getItem('fsh_user_role');
        if (role === 'Admin') {
            renderReservationsList();
        } else {
            renderTimeSlots();
            renderMyReservations();
        }
    }, 5000);
}

function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
}

// ============================================================================
// DATA — fetch from Worker/D1
// ============================================================================

async function fetchReservations() {
    try {
        const data = await apiCall(`/api/reservations?lab=${encodeURIComponent(currentLab)}`);
        if (data.success) {
            reservationsCache = data.reservations;
        }
    } catch (err) {
        console.error('Failed to fetch reservations:', err);
    }
}

function getAllReservations() {
    return reservationsCache;
}

function hasReservations(date) {
    const role = localStorage.getItem('fsh_user_role');
    if (role === 'Admin') {
        return reservationsCache.some(r => r.date === date && r.lab === currentLab);
    } else {
        return reservationsCache.some(r =>
            r.date === date && r.lab === currentLab && r.status === 'approved'
        );
    }
}

function isSlotReserved(date, timeSlot) {
    return reservationsCache.some(r =>
        r.date === date &&
        r.timeSlot === timeSlot &&
        r.lab === currentLab &&
        (r.status === 'approved' || r.status === 'pending')
    );
}

// ============================================================================
// USER VIEW (Teachers)
// ============================================================================

function initializeUserView() {
    document.getElementById('user-view')?.classList.remove('hidden');
    document.getElementById('admin-view')?.classList.add('hidden');

    document.getElementById('calendar-title').textContent = 'Select Date';
    document.getElementById('lab-subtitle').style.display = 'block';
    document.getElementById('user-calendar-controls').style.display  = 'flex';
    document.getElementById('admin-calendar-controls').style.display = 'none';

    renderTimeSlots();
    renderMyReservations();

    document.getElementById('reservation-form')
        ?.addEventListener('submit', handleReservationSubmit);
}

function renderTimeSlots() {
    const container = document.getElementById('time-slots');
    if (!container) return;

    container.innerHTML = '';

    TIME_SLOTS.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = 'time-slot';

        const isReserved = selectedDate && isSlotReserved(selectedDate, slot);

        if (isReserved) {
            slotEl.classList.add('reserved');
            slotEl.innerHTML = `${slot} <span style="font-size:11px;color:#ef4444;">(Reserved)</span>`;
            slotEl.style.cursor  = 'not-allowed';
            slotEl.style.opacity = '0.6';
        } else {
            slotEl.textContent = slot;
            slotEl.onclick = () => selectTimeSlot(slot, slotEl);
        }

        container.appendChild(slotEl);
    });
}

function selectTimeSlot(slot, element) {
    if (!selectedDate) { alert('Please select a date first'); return; }

    if (isSlotReserved(selectedDate, slot)) {
        alert('This time slot is already reserved. Please choose another time slot.');
        return;
    }

    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedTimeSlot = slot;
    updateFormState();
}

async function handleReservationSubmit(e) {
    e.preventDefault();

    if (!selectedDate || !selectedTimeSlot) {
        alert('Please select both date and time slot');
        return;
    }

    // Re-check conflict with latest data before submitting
    await fetchReservations();
    if (isSlotReserved(selectedDate, selectedTimeSlot)) {
        alert('This time slot was just reserved by someone else. Please select a different time slot.');
        renderTimeSlots();
        selectedTimeSlot = null;
        updateFormState();
        return;
    }

    const submitBtn = document.getElementById('submit-reservation');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

    try {
        const data = await apiCall('/api/reservations', 'POST', {
            lab:         currentLab,
            date:        selectedDate,
            timeSlot:    selectedTimeSlot,
            teacherName: document.getElementById('teacher-name').value,
            subject:     document.getElementById('subject').value,
            grade:       document.getElementById('grade').value,
            students:    document.getElementById('students').value,
            purpose:     document.getElementById('purpose').value
        });

        if (!data.success) {
            alert(data.message);
            return;
        }

        alert('✅ Reservation submitted successfully!\n\nYour request has been sent to the administrator for approval.');
        resetReservationForm();
        await fetchReservations();
        renderCalendar();

    } catch (err) {
        alert('Error: ' + (err.message || 'Could not reach the server.'));
        console.error(err);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = !selectedDate || !selectedTimeSlot;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Reservation';
        }
    }
}

function resetReservationForm() {
    document.getElementById('reservation-form')?.reset();
    selectedDate     = null;
    selectedTimeSlot = null;
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    updateFormState();
}

// ============================================================================
// MY RESERVATIONS — teacher can view and edit their own reservations
// ============================================================================

function renderMyReservations() {
    const userEmail = localStorage.getItem('fsh_user_email');
    const myReservations = reservationsCache
        .filter(r => r.lab === currentLab && r.requester === userEmail)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create or find the my-reservations section
    let section = document.getElementById('my-reservations-section');
    if (!section) {
        section = document.createElement('div');
        section.id = 'my-reservations-section';
        section.className = 'reservation-form';
        section.style.marginTop = '20px';
        document.getElementById('user-view')?.appendChild(section);
    }

    if (myReservations.length === 0) {
        section.innerHTML = '';
        return;
    }

    section.innerHTML = `
        <h3 style="margin-bottom: 16px;"><i class="fas fa-history"></i> My Reservations</h3>
        <div id="my-reservations-list"></div>
    `;

    const list = document.getElementById('my-reservations-list');
    myReservations.forEach(r => {
        const canEdit = r.status === 'pending' || r.status === 'approved';
        const statusColor = r.status === 'approved' ? '#22c55e' : r.status === 'declined' ? '#ef4444' : '#f59e0b';

        const item = document.createElement('div');
        item.style.cssText = `
            background: var(--hover-bg); border-radius: 12px; padding: 16px;
            margin-bottom: 12px; border-left: 4px solid ${statusColor}; overflow: hidden;
        `;
        item.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div>
                    <p style="font-weight:600; margin-bottom:4px; color:var(--text-color);">
                        <i class="far fa-calendar" style="margin-right:6px;"></i>${formatDate(r.date)}
                    </p>
                    <p style="font-size:13px; color:var(--secondary-text); margin-bottom:2px;">
                        <i class="far fa-clock" style="margin-right:6px;"></i>${r.timeSlot}
                    </p>
                    <p style="font-size:13px; color:var(--secondary-text); margin-bottom:2px;">
                        <i class="fas fa-book" style="margin-right:6px;"></i>${r.subject} — Grade ${r.grade}
                    </p>
                    <p style="font-size:13px; color:var(--secondary-text);">
                        <i class="fas fa-users" style="margin-right:6px;"></i>${r.students} students
                    </p>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; min-width:0;">
                    <span style="padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600;
                        background:${statusColor}; color:white; text-transform:uppercase; flex-shrink:0;">${r.status}</span>
                    ${canEdit ? `
                        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                            ${r.status === 'approved' ? `
                            <span style="font-size:11px; color:var(--secondary-text); line-height:1.3; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Will require re-approval</span>` : ''}
                            <button onclick="openEditModal('${r.id}')" style="
                                background:#081316; color:white; border:none; border-radius:20px;
                                padding:6px 14px; font-size:12px; cursor:pointer; display:flex;
                                align-items:center; gap:6px; transition:all 0.2s; flex-shrink:0;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

function openEditModal(reservationId) {
    const r = reservationsCache.find(r => r.id === reservationId);
    if (!r) return;

    document.getElementById('edit-reservation-modal')?.remove();
    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'edit-reservation-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; box-sizing: border-box; overflow-y: auto;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--card-bg); border-radius: 20px; width: 100%;
            max-width: 700px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
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
                <button onclick="closeEditModal()" style="
                    background: rgba(255,255,255,0.2); border: none; color: white;
                    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
                    font-size: 14px; display: flex; align-items: center; justify-content: center;
                "><i class="fas fa-times"></i></button>
            </div>
            <form id="edit-reservation-form" style="padding: 20px; display:flex; flex-direction:column; gap:14px;">
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Date</label>
                    <input type="date" id="edit-date" class="login-input" value="${r.date}" required
                        min="${new Date().toISOString().split('T')[0]}" style="margin:0;">
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Time Slot</label>
                    <select id="edit-timeslot" class="login-input" required style="margin:0;">
                        ${TIME_SLOTS.map(slot => `<option value="${slot}" ${slot === r.timeSlot ? 'selected' : ''}>${slot}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Teacher's Name</label>
                    <input type="text" id="edit-teacher-name" class="login-input" value="${r.teacherName || ''}" required style="margin:0;">
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Subject</label>
                    <select id="edit-subject" class="login-input" required style="margin:0;">
                        <option value="">Select subject</option>
                        ${['General Biology','Physics','Chemistry','ETECH'].map(s =>
                            `<option value="${s}" ${s === r.subject ? 'selected' : ''}>${s}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Grade Level</label>
                    <select id="edit-grade" class="login-input" required style="margin:0;">
                        <option value="">Select grade level</option>
                        <option value="11" ${r.grade == '11' ? 'selected' : ''}>Grade 11</option>
                        <option value="12" ${r.grade == '12' ? 'selected' : ''}>Grade 12</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Number of Students</label>
                    <input type="number" id="edit-students" class="login-input" value="${r.students}" required min="1" max="50" style="margin:0;">
                </div>
                <div>
                    <label style="font-size:13px; font-weight:500; color:var(--secondary-text); display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">Purpose / Activity</label>
                    <textarea id="edit-purpose" class="login-input" required style="margin:0; min-height:80px; resize:vertical; font-family:inherit;">${r.purpose}</textarea>
                </div>
                ${r.status === 'approved' ? `
                <div style="background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:10px;
                    padding:10px 14px; font-size:13px; color:#b45309; display:flex; gap:8px; align-items:flex-start;">
                    <i class="fas fa-exclamation-triangle" style="flex-shrink:0; margin-top:2px;"></i>
                    <span>Saving will reset this reservation to <strong>pending</strong> status and require admin re-approval.</span>
                </div>` : ''}
                <div style="display:flex; gap:10px; padding-top:4px;">
                    <button type="button" onclick="closeEditModal()" style="
                        flex:1; padding:11px; border-radius:50px; cursor:pointer;
                        background:transparent; color:var(--secondary-text);
                        border:1px solid var(--secondary-text); font-size:14px; font-weight:500;
                    ">Cancel</button>
                    <button type="submit" id="edit-submit-btn" style="
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
    modal.addEventListener('click', e => { if (e.target === modal) closeEditModal(); });
    document.getElementById('edit-reservation-form').addEventListener('submit', e => {
        handleEditSubmit(e, reservationId);
    });
}

function closeEditModal() {
    document.getElementById('edit-reservation-modal')?.remove();
    document.body.style.overflow = '';
}

async function handleEditSubmit(e, reservationId) {
    e.preventDefault();

    const newDate     = document.getElementById('edit-date').value;
    const newTimeSlot = document.getElementById('edit-timeslot').value;

    // Check for conflicts (excluding this reservation itself)
    const conflict = reservationsCache.some(r =>
        r.id !== reservationId &&
        r.date === newDate &&
        r.timeSlot === newTimeSlot &&
        r.lab === currentLab &&
        (r.status === 'approved' || r.status === 'pending')
    );

    if (conflict) {
        alert('That date and time slot is already taken. Please choose a different one.');
        return;
    }

    const submitBtn = document.getElementById('edit-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    try {
        const data = await apiCall(`/api/reservations/${reservationId}`, 'PATCH', {
            date:        newDate,
            timeSlot:    newTimeSlot,
            teacherName: document.getElementById('edit-teacher-name').value,
            subject:     document.getElementById('edit-subject').value,
            grade:       document.getElementById('edit-grade').value,
            students:    document.getElementById('edit-students').value,
            purpose:     document.getElementById('edit-purpose').value,
            status:      'pending',  // always reset to pending so admin must re-approve
        });

        if (!data.success) {
            alert(data.message || 'Failed to update reservation.');
            return;
        }

        closeEditModal();
        await fetchReservations();
        renderCalendar();
        renderMyReservations();
        renderTimeSlots();
        alert('✅ Reservation updated successfully!\n\nYour reservation has been resubmitted for admin approval.');

    } catch (err) {
        alert('Error: ' + (err.message || 'Could not reach the server.'));
        console.error(err);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes'; }
    }
}

function updateFormState() {
    const submitBtn = document.getElementById('submit-reservation');
    if (submitBtn) submitBtn.disabled = !selectedDate || !selectedTimeSlot;

    const selectedInfo = document.getElementById('selected-info');
    if (selectedInfo) {
        if (selectedDate && selectedTimeSlot) {
            selectedInfo.innerHTML = `
                <p><strong>Selected Date:</strong> ${formatDate(selectedDate)}</p>
                <p><strong>Selected Time:</strong> ${selectedTimeSlot}</p>
            `;
        } else {
            selectedInfo.innerHTML = '<p style="color:#707475;">Please select a date and time slot</p>';
        }
    }
}

// ============================================================================
// ADMIN VIEW
// ============================================================================

function initializeAdminView() {
    document.getElementById('user-view')?.classList.add('hidden');
    document.getElementById('admin-view')?.classList.remove('hidden');

    document.getElementById('calendar-title').textContent = 'Calendar Overview';
    document.getElementById('lab-subtitle').style.display = 'none';
    document.getElementById('user-calendar-controls').style.display  = 'none';
    document.getElementById('admin-calendar-controls').style.display = 'flex';

    // Add instruction banner
    const calendarContainer = document.querySelector('.calendar-container');
    if (calendarContainer && !document.getElementById('admin-calendar-instruction')) {
        const banner = document.createElement('div');
        banner.id = 'admin-calendar-instruction';
        banner.style.cssText = `
            background: linear-gradient(135deg, #081316 0%, #2a3a3f 100%);
            color: white; padding: 12px 20px; border-radius: 10px;
            margin-bottom: 15px; font-size: 14px;
            display: flex; align-items: center; gap: 10px;
        `;
        banner.innerHTML = `<i class="fas fa-info-circle" style="font-size:18px;"></i>
            <span>Click on any date to view reservations for that day</span>`;
        calendarContainer.insertBefore(banner, calendarContainer.querySelector('.calendar-header').nextSibling);
    }

    renderReservationsList();
}

function renderReservationsList() {
    const container = document.getElementById('reservations-list');
    if (!container) return;

    const reservations = reservationsCache
        .filter(r => r.lab === currentLab)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (reservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No reservations yet</p>
            </div>`;
        return;
    }

    const pendingCount  = reservations.filter(r => r.status === 'pending').length;
    const approvedCount = reservations.filter(r => r.status === 'approved').length;
    const declinedCount = reservations.filter(r => r.status === 'declined').length;

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${pendingCount  > 0 ? `<div style="padding:8px 16px;background:#f59e0b;color:white;border-radius:20px;font-size:13px;font-weight:600;"><i class="fas fa-clock"></i> ${pendingCount} Pending</div>` : ''}
                ${approvedCount > 0 ? `<div style="padding:8px 16px;background:#22c55e;color:white;border-radius:20px;font-size:13px;font-weight:600;"><i class="fas fa-check"></i> ${approvedCount} Approved</div>` : ''}
                ${declinedCount > 0 ? `<div style="padding:8px 16px;background:#ef4444;color:white;border-radius:20px;font-size:13px;font-weight:600;"><i class="fas fa-times"></i> ${declinedCount} Declined</div>` : ''}
            </div>
        </div>
    `;

    reservations.forEach(r => container.appendChild(createReservationItem(r)));
}

function createReservationItem(reservation) {
    const div = document.createElement('div');
    div.className = `reservation-item ${reservation.status}`;

    const teacherName  = reservation.teacherName || reservation.requester.split('@')[0];
    const statusBadge  = `<span class="reservation-status ${reservation.status}">${reservation.status}</span>`;

    div.innerHTML = `
        <div class="reservation-header">
            <div class="reservation-info">
                <h4>${teacherName}</h4>
                <p><i class="far fa-calendar"></i> ${formatDate(reservation.date)}</p>
                <p><i class="far fa-clock"></i> ${reservation.timeSlot}</p>
                <p><i class="fas fa-book"></i> ${reservation.subject} - Grade ${reservation.grade}</p>
                <p><i class="fas fa-users"></i> ${reservation.students} students</p>
                <p><i class="fas fa-info-circle"></i> ${reservation.purpose}</p>
            </div>
            ${statusBadge}
        </div>
        ${reservation.status === 'pending' ? `
            <div class="reservation-actions">
                <button class="approve-btn" onclick="approveReservation('${reservation.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="decline-btn" onclick="declineReservation('${reservation.id}')">
                    <i class="fas fa-times"></i> Decline
                </button>
            </div>
        ` : ''}
    `;

    return div;
}

async function approveReservation(id) {
    if (!confirm('✅ Approve this reservation?')) return;

    try {
        const data = await apiCall(`/api/reservations/${id}`, 'PATCH', { status: 'approved' });
        if (!data.success) { alert(data.message); return; }

        await fetchReservations();
        renderReservationsList();
        renderCalendar();
        alert('✅ Reservation approved! The teacher has been notified.');
    } catch (err) {
        alert('Error: ' + (err.message || 'Could not reach the server.'));
        console.error(err);
    }
}

async function declineReservation(id) {
    if (!confirm('❌ Decline this reservation?')) return;

    try {
        const data = await apiCall(`/api/reservations/${id}`, 'PATCH', { status: 'declined' });
        if (!data.success) { alert(data.message); return; }

        await fetchReservations();
        renderReservationsList();
        renderCalendar();
        alert('❌ Reservation declined. The teacher has been notified.');
    } catch (err) {
        alert('Error: ' + (err.message || 'Could not reach the server.'));
        console.error(err);
    }
}

// ============================================================================
// CALENDAR RENDERING
// ============================================================================

function renderCalendar() {
    if      (calendarView === 'daily')   renderDailyView();
    else if (calendarView === 'weekly')  renderWeeklyView();
    else                                 renderMonthlyView();
}

function renderMonthlyView() {
    const calendarGrid  = document.getElementById('calendar-grid');
    const monthYear     = document.getElementById('current-month-year');
    const adminMonthYear = document.getElementById('admin-month-year');
    if (!calendarGrid) return;

    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const displayText = `${monthNames[currentMonth]} ${currentYear}`;
    if (monthYear)      monthYear.textContent      = displayText;
    if (adminMonthYear) adminMonthYear.textContent = displayText;

    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';

    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(day => {
        const h = document.createElement('div');
        h.className   = 'calendar-day-header';
        h.textContent = day;
        calendarGrid.appendChild(h);
    });

    const firstDay  = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today     = new Date();
    const role      = localStorage.getItem('fsh_user_role');

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl   = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;

        const dateStr = formatDateForStorage(new Date(currentYear, currentMonth, day));
        const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
        const isPast  = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (isToday) dayEl.classList.add('today');
        if (dateStr === selectedDate) dayEl.classList.add('selected');
        if (hasReservations(dateStr)) dayEl.classList.add('has-reservations');

        if (role === 'Admin') {
            dayEl.onclick = () => handleAdminDateClick(dateStr, dayEl);
        } else {
            if (isPast) {
                dayEl.classList.add('past');
                dayEl.style.opacity = '0.4';
                dayEl.style.cursor  = 'not-allowed';
            } else {
                dayEl.onclick = () => handleDateSelect(dateStr, dayEl);
            }
        }

        calendarGrid.appendChild(dayEl);
    }
}

function renderWeeklyView() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    if (!currentWeekStart) currentWeekStart = getWeekStart(new Date());

    const monthYear      = document.getElementById('current-month-year');
    const adminMonthYear = document.getElementById('admin-month-year');
    const weekEnd        = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const label = `${currentWeekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${weekEnd.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
    if (monthYear)      monthYear.textContent      = label;
    if (adminMonthYear) adminMonthYear.textContent = label;

    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';

    const today = new Date();
    const role  = localStorage.getItem('fsh_user_role');

    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((day, i) => {
        const h    = document.createElement('div');
        h.className = 'calendar-day-header';
        const d    = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        h.textContent = `${day} ${d.getDate()}`;
        calendarGrid.appendChild(h);
    });

    for (let i = 0; i < 7; i++) {
        const d      = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        const dayEl  = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = d.getDate();

        const dateStr = formatDateForStorage(d);
        const isToday = d.toDateString() === today.toDateString();
        const isPast  = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (isToday) dayEl.classList.add('today');
        if (dateStr === selectedDate) dayEl.classList.add('selected');
        if (hasReservations(dateStr)) dayEl.classList.add('has-reservations');

        if (role === 'Admin') {
            dayEl.onclick = () => handleAdminDateClick(dateStr, dayEl);
        } else if (!isPast) {
            dayEl.onclick = () => handleDateSelect(dateStr, dayEl);
        } else {
            dayEl.classList.add('past');
            dayEl.style.opacity = '0.4';
            dayEl.style.cursor  = 'not-allowed';
        }

        calendarGrid.appendChild(dayEl);
    }
}

function renderDailyView() {
    const calendarGrid   = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    const monthYear      = document.getElementById('current-month-year');
    const adminMonthYear = document.getElementById('admin-month-year');
    const label = currentDay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (monthYear)      monthYear.textContent      = label;
    if (adminMonthYear) adminMonthYear.textContent = label;

    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = '1fr';

    const dateStr = formatDateForStorage(currentDay);
    const today   = new Date();
    const isPast  = currentDay < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const role    = localStorage.getItem('fsh_user_role');

    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day daily-view';

    if (currentDay.toDateString() === today.toDateString()) dayEl.classList.add('today');
    if (dateStr === selectedDate) dayEl.classList.add('selected');
    if (hasReservations(dateStr)) dayEl.classList.add('has-reservations');

    // Full date on top, large number below
    dayEl.innerHTML = `
        <span class="daily-full-date">${currentDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' })}</span>
        <span class="daily-day-number">${currentDay.getDate()}</span>
    `;

    if (role === 'Admin') {
        dayEl.onclick = () => handleAdminDateClick(dateStr, dayEl);
    } else if (!isPast) {
        dayEl.onclick = () => handleDateSelect(dateStr, dayEl);
    } else {
        dayEl.style.opacity = '0.4';
        dayEl.style.cursor  = 'not-allowed';
    }

    calendarGrid.appendChild(dayEl);
}

function handleDateSelect(dateStr, dayEl) {
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    dayEl.classList.add('selected');
    selectedDate     = dateStr;
    selectedTimeSlot = null;
    renderTimeSlots();
    updateFormState();
}

function handleAdminDateClick(dateStr, dayEl) {
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
    dayEl.classList.add('selected');

    const dayReservations = reservationsCache.filter(r => r.date === dateStr && r.lab === currentLab);
    showAdminDayReservations(dateStr, dayReservations);
}

function showAdminDayReservations(dateStr, reservations) {
    const container = document.getElementById('reservations-list');
    if (!container) return;

    container.innerHTML = `
        <div style="margin-bottom:20px; padding-bottom:15px; border-bottom:2px solid var(--hover-bg);">
            <h4 style="color:var(--text-color); margin:0;">
                <i class="far fa-calendar"></i> ${formatDate(dateStr)}
                <span style="font-size:13px; color:var(--secondary-text); margin-left:10px; font-weight:400;">
                    ${reservations.length} reservation${reservations.length !== 1 ? 's' : ''}
                </span>
            </h4>
        </div>
    `;

    if (reservations.length === 0) {
        container.innerHTML += `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No reservations for this date</p></div>`;
        return;
    }

    reservations
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
        .forEach(r => container.appendChild(createReservationItem(r)));
}

// ============================================================================
// CALENDAR NAVIGATION
// ============================================================================

function showCalendarView(view) {
    calendarView = view;
    if (view === 'weekly' && !currentWeekStart) currentWeekStart = getWeekStart(new Date());
    if (view === 'daily') currentDay = new Date();

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    renderCalendar();
}

function previousMonth() {
    if      (calendarView === 'daily')  currentDay.setDate(currentDay.getDate() - 1);
    else if (calendarView === 'weekly') { if (!currentWeekStart) currentWeekStart = getWeekStart(new Date()); currentWeekStart.setDate(currentWeekStart.getDate() - 7); }
    else { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } }
    renderCalendar();
}

function nextMonth() {
    if      (calendarView === 'daily')  currentDay.setDate(currentDay.getDate() + 1);
    else if (calendarView === 'weekly') { if (!currentWeekStart) currentWeekStart = getWeekStart(new Date()); currentWeekStart.setDate(currentWeekStart.getDate() + 7); }
    else { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } }
    renderCalendar();
}

function getWeekStart(date) {
    const d   = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

// ============================================================================
// UTILITY
// ============================================================================

function formatDate(dateString) {
    const date    = new Date(dateString);
    const options = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateForStorage(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function goBackToDashboard() { fshNavigate('dashboard.html'); }

function highlightDateFromMail(dateString, timeSlot) {
    const targetDate = new Date(dateString);
    currentMonth     = targetDate.getMonth();
    currentYear      = targetDate.getFullYear();
    renderCalendar();

    setTimeout(() => {
        document.querySelectorAll('.calendar-day').forEach(day => {
            if (parseInt(day.textContent) === targetDate.getDate() && !day.classList.contains('empty')) {
                day.click();
                day.scrollIntoView({ behavior:'smooth', block:'center' });
                day.style.boxShadow = '0 0 0 3px #081316, 0 0 20px rgba(8,19,22,0.5)';
                setTimeout(() => { day.style.boxShadow = ''; }, 3000);
            }
        });

        if (timeSlot) {
            setTimeout(() => {
                document.querySelectorAll('.time-slot').forEach(slot => {
                    if (slot.textContent.includes(timeSlot)) {
                        slot.scrollIntoView({ behavior:'smooth', block:'center' });
                        slot.style.boxShadow = '0 0 0 3px #081316, 0 0 20px rgba(8,19,22,0.5)';
                        setTimeout(() => { slot.style.boxShadow = ''; }, 3000);
                    }
                });
            }, 500);
        }
    }, 100);
}

// Stop polling when leaving the page
window.addEventListener('beforeunload', stopPolling);

// ── Expose globals ────────────────────────────────────────────────────────────
window.previousMonth          = previousMonth;
window.nextMonth              = nextMonth;
window.showCalendarView       = showCalendarView;
window.approveReservation     = approveReservation;
window.declineReservation     = declineReservation;
window.goBackToDashboard      = goBackToDashboard;
window.highlightDateFromMail  = highlightDateFromMail;
window.renderReservationsList = renderReservationsList;
window.openEditModal          = openEditModal;
window.closeEditModal         = closeEditModal;