// ============================================================================
// LABORATORY.JS - Calendar & Reservation Management
// ============================================================================

// Global state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentDay = new Date();
let currentWeekStart = null;
let calendarView = 'monthly'; // 'daily', 'weekly', 'monthly'
let selectedDate = null;
let selectedTimeSlot = null;
let currentLab = '';

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
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Get laboratory name from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentLab = urlParams.get('lab') || 'Laboratory';
    
    // Update page title
    document.title = `${currentLab} - FSH Lab Scheduler`;
    
    // Check authentication
    const email = localStorage.getItem('fsh_user_email');
    const role = localStorage.getItem('fsh_user_role');
    
    if (!email) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize UI based on role
    if (role === 'Admin') {
        initializeAdminView();
    } else {
        initializeUserView();
    }
    
    // Update user display
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        const userName = email.split('@')[0];
        userDisplay.innerText = `${userName} (${role})`;
    }
    
    // Render calendar
    renderCalendar();
    
    // Check if coming from mail with specific date/time
    const fromMail = urlParams.get('fromMail');
    const targetDate = urlParams.get('date');
    const targetTimeSlot = urlParams.get('timeSlot');
    
    if (fromMail === 'true' && targetDate) {
        // Wait for calendar to render, then highlight the date
        setTimeout(() => {
            highlightDateFromMail(targetDate, targetTimeSlot);
        }, 300);
    }
});

// ============================================================================
// USER VIEW (Teachers)
// ============================================================================

function initializeUserView() {
    // Show user sections
    document.getElementById('user-view')?.classList.remove('hidden');
    document.getElementById('admin-view')?.classList.add('hidden');
    
    // Update calendar title
    const calendarTitle = document.getElementById('calendar-title');
    if (calendarTitle) {
        calendarTitle.textContent = 'Select Date';
    }
    
    // Show the subtitle for teachers
    const labSubtitle = document.getElementById('lab-subtitle');
    if (labSubtitle) {
        labSubtitle.style.display = 'block';
    }
    
    // Show user calendar controls
    const userControls = document.getElementById('user-calendar-controls');
    if (userControls) {
        userControls.style.display = 'flex';
    }
    
    // Hide admin calendar controls
    const adminControls = document.getElementById('admin-calendar-controls');
    if (adminControls) {
        adminControls.style.display = 'none';
    }
    
    // Setup time slot selection
    renderTimeSlots();
    
    // Setup form submission
    const form = document.getElementById('reservation-form');
    if (form) {
        form.addEventListener('submit', handleReservationSubmit);
    }
}

function renderTimeSlots() {
    const container = document.getElementById('time-slots');
    if (!container) return;
    
    container.innerHTML = '';
    
    TIME_SLOTS.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        
        // Check if slot is reserved for selected date
        const isReserved = selectedDate && isSlotReserved(selectedDate, slot);
        
        if (isReserved) {
            slotElement.classList.add('reserved');
            slotElement.innerHTML = `${slot} <span style="font-size: 11px; color: #ef4444;">(Reserved)</span>`;
            slotElement.style.cursor = 'not-allowed';
            slotElement.style.opacity = '0.6';
        } else {
            slotElement.textContent = slot;
            slotElement.onclick = () => selectTimeSlot(slot, slotElement);
        }
        
        container.appendChild(slotElement);
    });
}

function selectTimeSlot(slot, element) {
    if (!selectedDate) {
        alert('Please select a date first');
        return;
    }
    
    // Check if slot is available
    if (isSlotReserved(selectedDate, slot)) {
        alert('This time slot is already reserved. Please choose another time slot.');
        return;
    }
    
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Select new slot
    element.classList.add('selected');
    selectedTimeSlot = slot;
    
    // Enable form
    updateFormState();
}

function handleReservationSubmit(e) {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot) {
        alert('Please select both date and time slot');
        return;
    }
    
    // Final check for conflicts
    if (isSlotReserved(selectedDate, selectedTimeSlot)) {
        alert('This time slot has just been reserved by someone else. Please select a different time slot.');
        // Refresh time slots
        renderTimeSlots();
        selectedTimeSlot = null;
        updateFormState();
        return;
    }
    
    const email = localStorage.getItem('fsh_user_email');
    const formData = {
        id: Date.now().toString(),
        lab: currentLab,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        teacherName: document.getElementById('teacher-name').value,
        subject: document.getElementById('subject').value,
        grade: document.getElementById('grade').value,
        students: document.getElementById('students').value,
        purpose: document.getElementById('purpose').value,
        requester: email,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // Save reservation
    saveReservation(formData);

    // Send notification to admin (using the notifications.js function)
    if (typeof window.sendAdminNotification === 'function') {
        window.sendAdminNotification(formData);
    }

    // Show success message
    alert('✅ Reservation submitted successfully!\n\nYour request has been sent to the administrator for approval. You will be notified once it has been reviewed.');
    
    // Reset form
    resetReservationForm();
    
    // Refresh calendar
    renderCalendar();
}

function resetReservationForm() {
    document.getElementById('reservation-form')?.reset();
    selectedDate = null;
    selectedTimeSlot = null;
    
    // Clear selections
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('.time-slot').forEach(el => {
        el.classList.remove('selected');
    });
    
    updateFormState();
}

function updateFormState() {
    const submitBtn = document.getElementById('submit-reservation');
    if (submitBtn) {
        submitBtn.disabled = !selectedDate || !selectedTimeSlot;
    }
    
    // Update selected info display
    const selectedInfo = document.getElementById('selected-info');
    if (selectedInfo) {
        if (selectedDate && selectedTimeSlot) {
            selectedInfo.innerHTML = `
                <p><strong>Selected Date:</strong> ${formatDate(selectedDate)}</p>
                <p><strong>Selected Time:</strong> ${selectedTimeSlot}</p>
            `;
        } else {
            selectedInfo.innerHTML = '<p style="color: #707475;">Please select a date and time slot</p>';
        }
    }
}

// ============================================================================
// ADMIN VIEW
// ============================================================================

function initializeAdminView() {
    document.getElementById('user-view')?.classList.add('hidden');
    document.getElementById('admin-view')?.classList.remove('hidden');
    
    // Update calendar title
    const calendarTitle = document.getElementById('calendar-title');
    if (calendarTitle) {
        calendarTitle.textContent = 'Calendar Overview';
    }
    
    // Hide the subtitle for admins
    const labSubtitle = document.getElementById('lab-subtitle');
    if (labSubtitle) {
        labSubtitle.style.display = 'none';
    }
    
    // Hide user calendar controls (view toggle buttons)
    const userControls = document.getElementById('user-calendar-controls');
    if (userControls) {
        userControls.style.display = 'none';
    }
    
    // Show admin calendar controls (just navigation)
    const adminControls = document.getElementById('admin-calendar-controls');
    if (adminControls) {
        adminControls.style.display = 'flex';
    }
    
    // Add instruction banner for admins
    const calendarContainer = document.querySelector('.calendar-container');
    if (calendarContainer) {
        let instructionBanner = document.getElementById('admin-calendar-instruction');
        if (!instructionBanner) {
            instructionBanner = document.createElement('div');
            instructionBanner.id = 'admin-calendar-instruction';
            instructionBanner.style.cssText = `
                background: linear-gradient(135deg, #081316 0%, #2a3a3f 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 10px;
                margin-bottom: 15px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            instructionBanner.innerHTML = `
                <i class="fas fa-info-circle" style="font-size: 18px;"></i>
                <span>Click on any date (including past dates) to view reservations for that day</span>
            `;
            calendarContainer.insertBefore(instructionBanner, calendarContainer.querySelector('.calendar-header').nextSibling);
        }
    }
    
    renderReservationsList();
}

function renderReservationsList() {
    const container = document.getElementById('reservations-list');
    if (!container) return;
    
    const reservations = getAllReservations()
        .filter(r => r.lab === currentLab)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (reservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No reservations yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    reservations.forEach(reservation => {
        const item = createReservationItem(reservation);
        container.appendChild(item);
    });
}

function createReservationItem(reservation) {
    const div = document.createElement('div');
    div.className = `reservation-item ${reservation.status}`;
    
    const userName = reservation.requester.split('@')[0];
    const teacherName = reservation.teacherName || userName; // Use teacher name if available, fallback to email username
    const statusBadge = `<span class="reservation-status ${reservation.status}">${reservation.status}</span>`;
    
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

function approveReservation(id) {
    if (!confirm('✅ Approve this reservation?')) return;
    
    const reservations = getAllReservations();
    const index = reservations.findIndex(r => r.id === id);
    
    if (index !== -1) {
        reservations[index].status = 'approved';
        localStorage.setItem('fsh_reservations', JSON.stringify(reservations));
        
        // Update all related notifications
        updateAllNotificationsForReservation(id, 'approved');
        
        // Send notification to teacher (using the notifications.js function)
        if (typeof window.sendApprovalNotification === 'function') {
            window.sendApprovalNotification(reservations[index], true);
        }
        
        renderReservationsList();
        renderCalendar();
        alert('✅ Reservation approved!\n\nThe teacher has been notified.');
    }
}

function declineReservation(id) {
    if (!confirm('❌ Decline this reservation?')) return;
    
    const reservations = getAllReservations();
    const index = reservations.findIndex(r => r.id === id);
    
    if (index !== -1) {
        reservations[index].status = 'declined';
        localStorage.setItem('fsh_reservations', JSON.stringify(reservations));
        
        // Update all related notifications (use 'rejected' for notifications)
        updateAllNotificationsForReservation(id, 'rejected');
        
        // Send notification to teacher (using the notifications.js function)
        if (typeof window.sendApprovalNotification === 'function') {
            // For notification purposes, use 'rejected' status
            const notifData = {...reservations[index], status: 'rejected'};
            window.sendApprovalNotification(notifData, false);
        }
        
        renderReservationsList();
        renderCalendar();
        alert('❌ Reservation declined.\n\nThe teacher has been notified.');
    }
}

function updateAllNotificationsForReservation(reservationId, newStatus) {
    // Get all notifications from localStorage
    const notificationsData = localStorage.getItem('fsh_notifications');
    if (!notificationsData) return;
    
    const notifications = JSON.parse(notificationsData);
    let updated = false;
    
    // Update all request-type notifications for this reservation
    notifications.forEach(notification => {
        if (notification.reservationId === reservationId && notification.type === 'request') {
            notification.status = newStatus;
            updated = true;
        }
    });
    
    // Save if any updates were made
    if (updated) {
        localStorage.setItem('fsh_notifications', JSON.stringify(notifications));
    }
}

// ============================================================================
// CALENDAR RENDERING
// ============================================================================

function renderCalendar() {
    if (calendarView === 'daily') {
        renderDailyView();
    } else if (calendarView === 'weekly') {
        renderWeeklyView();
    } else {
        renderMonthlyView();
    }
}

// ============================================================================
// MONTHLY VIEW (Original)
// ============================================================================

function renderMonthlyView() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('current-month-year');
    const adminMonthYear = document.getElementById('admin-month-year');
    
    if (!calendarGrid) return;
    
    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const displayText = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Update both displays (user and admin)
    if (monthYear) monthYear.textContent = displayText;
    if (adminMonthYear) adminMonthYear.textContent = displayText;
    
    // Clear calendar and reset grid
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        const date = new Date(currentYear, currentMonth, day);
        const dateString = formatDateForStorage(date);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Mark past days
        if (date < todayDate) {
            dayElement.classList.add('past');
        }
        
        // Mark today
        if (date.toDateString() === new Date().toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Mark days with reservations
        if (hasReservations(dateString)) {
            dayElement.classList.add('has-reservation');
        }
        
        // Add click handler
        const role = localStorage.getItem('fsh_user_role');
        if (role === 'Admin') {
            // Admin can click ANY date (including past dates) to see reservations
            dayElement.onclick = () => selectDateAdmin(dateString, dayElement);
            dayElement.style.cursor = 'pointer';
            // Add subtle hover effect for admin
            dayElement.addEventListener('mouseenter', function() {
                if (!this.classList.contains('selected')) {
                    this.style.backgroundColor = 'var(--hover-bg)';
                }
            });
            dayElement.addEventListener('mouseleave', function() {
                if (!this.classList.contains('selected')) {
                    this.style.backgroundColor = '';
                }
            });
        } else if (date >= todayDate) {
            // Teachers can only click future dates
            dayElement.onclick = () => selectDate(dateString, dayElement);
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

// ============================================================================
// WEEKLY VIEW
// ============================================================================

function renderWeeklyView() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('current-month-year');
    const adminMonthYear = document.getElementById('admin-month-year');
    
    if (!calendarGrid) return;
    
    if (!currentWeekStart) {
        currentWeekStart = getWeekStart(new Date());
    }
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Display week range
    const displayText = `${monthNames[currentWeekStart.getMonth()]} ${currentWeekStart.getDate()} - ${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${currentWeekStart.getFullYear()}`;
    
    // Update both displays (user and admin)
    if (monthYear) monthYear.textContent = displayText;
    if (adminMonthYear) adminMonthYear.textContent = displayText;
    
    // Clear calendar and reset grid
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    const today = new Date();
    
    // Add 7 days of the week
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateString = formatDateForStorage(date);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        
        if (date < todayDate) {
            dayElement.classList.add('past');
        }
        
        if (date.toDateString() === new Date().toDateString()) {
            dayElement.classList.add('today');
        }
        
        if (hasReservations(dateString)) {
            dayElement.classList.add('has-reservation');
        }
        
        const role = localStorage.getItem('fsh_user_role');
        if (role === 'Admin') {
            // Admin can click ANY date to see reservations
            dayElement.onclick = () => selectDateAdmin(dateString, dayElement);
            dayElement.style.cursor = 'pointer';
            // Add subtle hover effect for admin
            dayElement.addEventListener('mouseenter', function() {
                if (!this.classList.contains('selected')) {
                    this.style.backgroundColor = 'var(--hover-bg)';
                }
            });
            dayElement.addEventListener('mouseleave', function() {
                if (!this.classList.contains('selected')) {
                    this.style.backgroundColor = '';
                }
            });
        } else if (date >= todayDate) {
            // Teachers can only click future dates
            dayElement.onclick = () => selectDate(dateString, dayElement);
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

// ============================================================================
// DAILY VIEW
// ============================================================================

function renderDailyView() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('current-month-year');
    const adminMonthYear = document.getElementById('admin-month-year');
    
    if (!calendarGrid) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const displayText = `${dayNames[currentDay.getDay()]}, ${monthNames[currentDay.getMonth()]} ${currentDay.getDate()}, ${currentDay.getFullYear()}`;
    
    // Update both displays (user and admin)
    if (monthYear) monthYear.textContent = displayText;
    if (adminMonthYear) adminMonthYear.textContent = displayText;
    
    // Clear calendar and change grid layout
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = '1fr';
    
    const dateString = formatDateForStorage(currentDay);
    const today = new Date();
    
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day daily-view';
    dayElement.innerHTML = `
        <div class="daily-date">
            <div class="daily-day-name">${dayNames[currentDay.getDay()]}</div>
            <div class="daily-day-number">${currentDay.getDate()}</div>
            <div class="daily-month-year">${monthNames[currentDay.getMonth()]} ${currentDay.getFullYear()}</div>
        </div>
    `;
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    if (currentDay < todayDate) {
        dayElement.classList.add('past');
    }
    
    if (currentDay.toDateString() === new Date().toDateString()) {
        dayElement.classList.add('today');
    }
    
    if (hasReservations(dateString)) {
        dayElement.classList.add('has-reservation');
    }
    
    const role = localStorage.getItem('fsh_user_role');
    if (role === 'Admin') {
        // Admin can view reservations for ANY date (including past dates)
        dayElement.classList.add('selected');
        selectedDate = dateString;
        dayElement.onclick = () => selectDateAdmin(dateString, dayElement);
        dayElement.style.cursor = 'pointer';
        
        // Show reservations for this date
        renderReservationsForDate(dateString);
    } else if (currentDay >= todayDate) {
        // Teacher view - only future dates
        dayElement.classList.add('selected');
        selectedDate = dateString;
        dayElement.onclick = () => {
            selectedDate = dateString;
            renderTimeSlots();
            updateFormState();
        };
        
        // Auto-select and show time slots
        renderTimeSlots();
        updateFormState();
    }
    
    calendarGrid.appendChild(dayElement);
}

function selectDate(date, element) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Select new date
    element.classList.add('selected');
    selectedDate = date;
    
    // Clear time slot selection
    selectedTimeSlot = null;
    
    // Re-render time slots to show availability
    renderTimeSlots();
    
    // Update form state
    updateFormState();
}

// Admin date selection - shows all reservations for that date
function selectDateAdmin(date, element) {
    console.log('Admin clicked date:', date);
    console.log('Current lab:', currentLab);
    
    // Remove previous selection from all calendar grids and clear any inline styles
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
        el.style.backgroundColor = ''; // Clear any inline background color
        el.style.transform = ''; // Clear any transform
    });
    
    // Select new date with visual feedback
    element.classList.add('selected');
    selectedDate = date;
    
    // Add a subtle animation to confirm selection
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
        element.style.transform = '';
    }, 150);
    
    // Show all reservations for this date
    console.log('Calling renderReservationsForDate...');
    renderReservationsForDate(date);
    
    // Scroll to reservations list smoothly
    const reservationsList = document.getElementById('reservations-list');
    console.log('Reservations list element:', reservationsList);
    if (reservationsList) {
        setTimeout(() => {
            reservationsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
    }
}

// Render reservations filtered by date
function renderReservationsForDate(dateString) {
    console.log('renderReservationsForDate called with:', dateString);
    const container = document.getElementById('reservations-list');
    console.log('Container element:', container);
    
    if (!container) {
        console.error('reservations-list container not found!');
        return;
    }
    
    const allReservations = getAllReservations()
        .filter(r => r.lab === currentLab && r.date === dateString)
        .sort((a, b) => {
            // Sort by status (pending first), then by time slot
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return a.timeSlot.localeCompare(b.timeSlot);
        });
    
    console.log('Filtered reservations:', allReservations);
    
    const formattedDate = formatDate(dateString);
    
    if (allReservations.length === 0) {
        container.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: var(--hover-bg); border-radius: 10px; border-left: 4px solid #081316;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <h3 style="margin: 0 0 5px 0; color: var(--text-color); font-size: 16px;">
                            <i class="fas fa-calendar-day"></i> ${formattedDate}
                        </h3>
                        <p style="margin: 0; color: var(--secondary-text); font-size: 13px;">
                            ${currentLab}
                        </p>
                    </div>
                    <button onclick="renderReservationsList()" style="
                        background: #081316;
                        color: white;
                        border: 2px solid #081316;
                        padding: 10px 20px;
                        border-radius: 50px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.3s ease;
                        flex-shrink: 0;
                    " onmouseover="this.style.background='transparent'; this.style.color='#081316';" 
                       onmouseout="this.style.background='#081316'; this.style.color='white';">
                        <i class="fas fa-list"></i> View All Reservations
                    </button>
                </div>
            </div>
            <div class="empty-state">
                <i class="fas fa-calendar-check" style="font-size: 48px; opacity: 0.3; margin-bottom: 15px; color: var(--secondary-text);"></i>
                <p style="font-size: 16px; color: var(--secondary-text); margin: 0;">No reservations for this date</p>
            </div>
        `;
        console.log('No reservations found, empty state displayed');
        return;
    }
    
    // Header with date info and summary
    const pendingCount = allReservations.filter(r => r.status === 'pending').length;
    const approvedCount = allReservations.filter(r => r.status === 'approved').length;
    const declinedCount = allReservations.filter(r => r.status === 'declined').length;
    
    console.log('Rendering header with counts - Pending:', pendingCount, 'Approved:', approvedCount, 'Declined:', declinedCount);
    
    container.innerHTML = `
        <div style="margin-bottom: 25px; padding: 20px; background: var(--hover-bg); border-radius: 15px; border-left: 4px solid #081316;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap; margin-bottom: 15px;">
                <div style="flex: 1; min-width: 200px;">
                    <h3 style="margin: 0 0 5px 0; color: var(--text-color); font-size: 18px;">
                        <i class="fas fa-calendar-day"></i> ${formattedDate}
                    </h3>
                    <p style="margin: 0; color: var(--secondary-text); font-size: 14px;">
                        ${currentLab} • ${allReservations.length} reservation${allReservations.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onclick="renderReservationsList()" style="
                    background: #081316;
                    color: white;
                    border: 2px solid #081316;
                    padding: 10px 20px;
                    border-radius: 50px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                " onmouseover="this.style.background='transparent'; this.style.color='#081316';" 
                   onmouseout="this.style.background='#081316'; this.style.color='white';">
                    <i class="fas fa-list"></i> View All
                </button>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${pendingCount > 0 ? `
                    <div style="padding: 8px 16px; background: #f59e0b; color: white; border-radius: 20px; font-size: 13px; font-weight: 600;">
                        <i class="fas fa-clock"></i> ${pendingCount} Pending
                    </div>
                ` : ''}
                ${approvedCount > 0 ? `
                    <div style="padding: 8px 16px; background: #22c55e; color: white; border-radius: 20px; font-size: 13px; font-weight: 600;">
                        <i class="fas fa-check"></i> ${approvedCount} Approved
                    </div>
                ` : ''}
                ${declinedCount > 0 ? `
                    <div style="padding: 8px 16px; background: #ef4444; color: white; border-radius: 20px; font-size: 13px; font-weight: 600;">
                        <i class="fas fa-times"></i> ${declinedCount} Declined
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    allReservations.forEach(reservation => {
        const item = createReservationItem(reservation);
        container.appendChild(item);
    });
    
    console.log('Finished rendering', allReservations.length, 'reservations');
}

function updateTimeSlotAvailability() {
    if (!selectedDate) return;
    
    const slots = document.querySelectorAll('.time-slot');
    slots.forEach(slot => {
        const timeText = slot.textContent;
        slot.classList.remove('disabled', 'selected');
        
        if (isSlotReserved(selectedDate, timeText)) {
            slot.classList.add('disabled');
        }
    });
    
    selectedTimeSlot = null;
}

function previousMonth() {
    if (calendarView === 'daily') {
        currentDay.setDate(currentDay.getDate() - 1);
    } else if (calendarView === 'weekly') {
        if (!currentWeekStart) currentWeekStart = getWeekStart(new Date());
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    } else {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
    }
    renderCalendar();
}

function nextMonth() {
    if (calendarView === 'daily') {
        currentDay.setDate(currentDay.getDate() + 1);
    } else if (calendarView === 'weekly') {
        if (!currentWeekStart) currentWeekStart = getWeekStart(new Date());
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    } else {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    renderCalendar();
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

function saveReservation(reservation) {
    const reservations = getAllReservations();
    reservations.push(reservation);
    localStorage.setItem('fsh_reservations', JSON.stringify(reservations));
}

function getAllReservations() {
    const data = localStorage.getItem('fsh_reservations');
    return data ? JSON.parse(data) : [];
}

function hasReservations(date) {
    const reservations = getAllReservations();
    const role = localStorage.getItem('fsh_user_role');
    
    if (role === 'Admin') {
        // Admin sees indicator for ANY reservation (pending, approved, or declined)
        return reservations.some(r => 
            r.date === date && 
            r.lab === currentLab
        );
    } else {
        // Teachers only see indicator for approved reservations
        return reservations.some(r => 
            r.date === date && 
            r.lab === currentLab && 
            r.status === 'approved'
        );
    }
}

function isSlotReserved(date, timeSlot) {
    const reservations = getAllReservations();
    return reservations.some(r => 
        r.date === date && 
        r.timeSlot === timeSlot && 
        r.lab === currentLab && 
        (r.status === 'approved' || r.status === 'pending')
    );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateForStorage(date) {
    // Use local date components to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

function highlightDateFromMail(dateString, timeSlot) {
    // Parse the date to set the correct month/year
    const targetDate = new Date(dateString);
    currentMonth = targetDate.getMonth();
    currentYear = targetDate.getFullYear();
    
    // Re-render calendar with the correct month
    renderCalendar();
    
    // Wait a bit for calendar to render
    setTimeout(() => {
        // Find and click the date
        const calendarDays = document.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            const dayNum = parseInt(day.textContent);
            if (dayNum === targetDate.getDate() && !day.classList.contains('empty')) {
                day.click();
                
                // Scroll to the date
                day.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add a visual highlight
                day.style.boxShadow = '0 0 0 3px #081316, 0 0 20px rgba(8, 19, 22, 0.5)';
                setTimeout(() => {
                    day.style.boxShadow = '';
                }, 3000);
            }
        });
        
        // Highlight the time slot if provided
        if (timeSlot) {
            setTimeout(() => {
                const timeSlots = document.querySelectorAll('.time-slot');
                timeSlots.forEach(slot => {
                    if (slot.textContent.includes(timeSlot)) {
                        // Scroll to the time slot
                        slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Add a visual highlight
                        slot.style.boxShadow = '0 0 0 3px #081316, 0 0 20px rgba(8, 19, 22, 0.5)';
                        setTimeout(() => {
                            slot.style.boxShadow = '';
                        }, 3000);
                    }
                });
            }, 500);
        }
    }, 100);
}

// Calendar view toggle
function showCalendarView(view) {
    console.log('Calendar view changed to:', view);
    
    // Update calendar view state
    calendarView = view;
    
    // Initialize view-specific states
    if (view === 'weekly' && !currentWeekStart) {
        currentWeekStart = getWeekStart(new Date());
    }
    if (view === 'daily') {
        currentDay = new Date();
    }
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });
    
    // Render the appropriate calendar view
    renderCalendar();
}

// Make functions globally available
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.showCalendarView = showCalendarView;
window.approveReservation = approveReservation;
window.declineReservation = declineReservation;
window.goBackToDashboard = goBackToDashboard;
window.highlightDateFromMail = highlightDateFromMail;
window.renderReservationsList = renderReservationsList;