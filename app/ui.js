// ============================================================================
// UI.JS - User Interface & View Management
// ============================================================================

// ============================================================================
// VIEW NAVIGATION
// ============================================================================

function showView(viewId) {
    const views = [
        'selection-view',
        'login-view',
        'signup-view',
        'signup-password-view',
        'forgot-password-view',
        'otp-view',
        'reset-password-view'
    ];
    
    views.forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            view.style.display = 'none';
        }
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'flex';
        targetView.classList.add('fade-in');
        setTimeout(() => targetView.classList.remove('fade-in'), 800);
    }
}

function goBack() {
    clearAllInputs();
    confirmedEmail = "";
    otpData = null;
    showView('selection-view');
}

function showSignup() {
    const signupEmailInput = document.getElementById('signup-email');
    if (signupEmailInput) {
        signupEmailInput.placeholder = "usernameid@firstasia.edu.ph";
    }
    
    clearPasswordField('login-password');
    showView('signup-view');
}

function showLoginFromSignup() {
    clearPasswordField('login-password');
    confirmedEmail = "";
    showView('login-view');
}

function backToEmailStep() {
    clearPasswordField('signup-password');
    clearPasswordField('signup-confirm-password');
    showView('signup-view');
}

function showForgotPassword() {
    clearInput('forgot-email');
    showView('forgot-password-view');
}

function backToLogin() {
    otpData = null;
    clearPasswordField('login-password');
    showView('login-view');
}

function backToForgotPassword() {
    clearInput('otp-code');
    showView('forgot-password-view');
}

// ============================================================================
// PASSWORD VISIBILITY TOGGLE
// ============================================================================

// every field toggles independently
function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    toggleSinglePasswordField(input, icon);
}

function toggleSinglePasswordField(input, icon) {
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function togglePasswordFields(input1, icon1, input2, icon2) {
    if (input1.type === 'password') {
        input1.type = 'text';
        input2.type = 'text';
        icon1.classList.remove('fa-eye');
        icon1.classList.add('fa-eye-slash');
        icon2.classList.remove('fa-eye');
        icon2.classList.add('fa-eye-slash');
    } else {
        input1.type = 'password';
        input2.type = 'password';
        icon1.classList.remove('fa-eye-slash');
        icon1.classList.add('fa-eye');
        icon2.classList.remove('fa-eye-slash');
        icon2.classList.add('fa-eye');
    }
}

function updatePasswordIconVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input?.parentElement.querySelector('.password-toggle');
    
    if (input && icon) {
        icon.style.display = input.value.length > 0 ? 'block' : 'none';
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clearAllInputs() {
    const allInputs = document.querySelectorAll('.login-input');
    allInputs.forEach(input => {
        input.classList.remove('input-error');
        input.value = "";
    });
}

// ============================================================================
// DASHBOARD LOGIC
// ============================================================================

function initializeDashboard() {
    const email = localStorage.getItem('fsh_user_email');
    const role = localStorage.getItem('fsh_user_role');

    if (!email) {
        window.location.href = "index.html";
        return;
    }

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        const userName = email.split('@')[0];
        userDisplay.innerText = `${userName} (${role})`;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

function selectLab(labName) {
    console.log("Lab selected: " + labName);
    // Future implementation: window.location.href = `booking.html?lab=${labName}`;
}

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard if on dashboard page
    if (window.location.pathname.includes("dashboard")) {
        initializeDashboard();
    }
});
