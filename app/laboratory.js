// ============================================================================
// LABORATORY.JS - Calendar & Reservation Management
// ============================================================================

// Global state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let selectedTimeSlot = null;
let currentLab = '';

// Time slots available for reservation
const TIME_SLOTS = [
    '07:00 - 08:00',
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00'
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
});

// ============================================================================
// USER VIEW (Teachers)
// ============================================================================

function initializeUserView() {
    // Show user sections
    document.getElementById('user-view')?.classList.remove('hidden');
    document.getElementById('admin-view')?.classList.add('hidden');
    
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
        slotElement.textContent = slot;
        slotElement.onclick = () => selectTimeSlot(slot, slotElement);
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
        alert('This time slot is already reserved');
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
    
    const email = localStorage.getItem('fsh_user_email');
    const formData = {
        id: Date.now().toString(),
        lab: currentLab,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
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
    
    // Show success message
    alert('Reservation submitted successfully! Waiting for admin approval.');
    
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
    const statusBadge = `<span class="reservation-status ${reservation.status}">${reservation.status}</span>`;
    
    div.innerHTML = `
        <div class="reservation-header">
            <div class="reservation-info">
                <h4>${userName}</h4>
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
    if (!confirm('Approve this reservation?')) return;
    
    const reservations = getAllReservations();
    const index = reservations.findIndex(r => r.id === id);
    
    if (index !== -1) {
        reservations[index].status = 'approved';
        localStorage.setItem('fsh_reservations', JSON.stringify(reservations));
        renderReservationsList();
        renderCalendar();
        alert('Reservation approved!');
    }
}

function declineReservation(id) {
    if (!confirm('Decline this reservation?')) return;
    
    const reservations = getAllReservations();
    const index = reservations.findIndex(r => r.id === id);
    
    if (index !== -1) {
        reservations[index].status = 'declined';
        localStorage.setItem('fsh_reservations', JSON.stringify(reservations));
        renderReservationsList();
        renderCalendar();
        alert('Reservation declined.');
    }
}

// ============================================================================
// CALENDAR RENDERING
// ============================================================================

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYear = document.getElementById('current-month-year');
    
    if (!calendarGrid || !monthYear) return;
    
    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Clear calendar
    calendarGrid.innerHTML = '';
    
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
        
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Mark past days
        if (date < today.setHours(0, 0, 0, 0)) {
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
        
        // Add click handler for future dates
        if (date >= today.setHours(0, 0, 0, 0)) {
            dayElement.onclick = () => selectDate(dateString, dayElement);
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

function selectDate(date, element) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Select new date
    element.classList.add('selected');
    selectedDate = date;
    
    // Update time slots availability
    updateTimeSlotAvailability();
    
    // Update form state
    updateFormState();
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
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
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
    return reservations.some(r => 
        r.date === date && 
        r.lab === currentLab && 
        r.status === 'approved'
    );
}

function isSlotReserved(date, timeSlot) {
    const reservations = getAllReservations();
    return reservations.some(r => 
        r.date === date && 
        r.timeSlot === timeSlot && 
        r.lab === currentLab && 
        r.status === 'approved'
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
    return date.toISOString().split('T')[0];
}

function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

// Make functions globally available
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.approveReservation = approveReservation;
window.declineReservation = declineReservation;
window.goBackToDashboard = goBackToDashboard;
