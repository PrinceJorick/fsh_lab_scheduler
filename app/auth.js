// ============================================================================
// AUTH.JS — Cloudflare Workers Version
// Uses JWT tokens stored in localStorage (stateless auth)
// ============================================================================

// ── Change this to your deployed Worker URL ──────────────────────────────────
// It will look like: https://fsh-api.YOUR-SUBDOMAIN.workers.dev
const API_BASE = 'https://fsh-scheduler.medranowilljairuz.workers.dev';

// ── Token helpers ─────────────────────────────────────────────────────────────
function saveSession(token, user) {
    localStorage.setItem('fsh_token',      token);
    localStorage.setItem('fsh_user_email', user.email);
    localStorage.setItem('fsh_user_role',  user.role);
}

function clearSession() {
    localStorage.removeItem('fsh_token');
    localStorage.removeItem('fsh_user_email');
    localStorage.removeItem('fsh_user_role');
}

function getToken() {
    return localStorage.getItem('fsh_token');
}

// ── API helper — automatically attaches Bearer token ─────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    return fetch(`${API_BASE}${endpoint}`, options);
}

// ============================================================================
// ROLE SELECTION
// ============================================================================

let selectedRole   = '';
let confirmedEmail = '';
let otpData        = null;

function handleSelection(clickedBtn) {
    selectedRole = clickedBtn.innerText;
    const emailInput = document.querySelector('#login-email');
    if (emailInput) emailInput.placeholder = selectedRole === 'Admin' ? 'adminid@firstasia.edu.ph' : 'teacherid@firstasia.edu.ph';
    clearPasswordField('login-password');
    showView('login-view');
}

// ============================================================================
// LOGIN
// ============================================================================

async function handleLogin() {
    const email    = getInputValue('login-email').toLowerCase();
    const password = getInputValue('login-password');

    clearError('login-email');
    clearError('login-password');

    if (!validateEmailDomain(email)) {
        showError('login-email', 'Access Denied: Use school email');
        return;
    }

    try {
        const res  = await apiCall('/api/login', 'POST', { email, password });
        const data = await res.json();

        if (!data.success) {
            data.message.includes('No account')
                ? showError('login-email')
                : showError('login-password');
            alert(data.message);
            return;
        }

        saveSession(data.token, data.user);
        fshNavigate('dashboard.html');

    } catch (err) {
        alert('Could not reach the server. Please try again.');
        console.error(err);
    }
}

// ============================================================================
// SIGNUP
// ============================================================================

async function confirmEmail() {
    const email = getInputValue('signup-email').toLowerCase();
    clearError('signup-email');

    if (!validateEmailDomain(email)) {
        showError('signup-email', 'Access Denied: Use school email');
        return;
    }

    confirmedEmail = email;

    try {
        const res  = await apiCall('/api/send-verification', 'POST', { email });
        const data = await res.json();

        if (!data.success) {
            // If account already exists, let them know
            if (res.status === 409) {
                showError('signup-email');
            }
            alert(data.message);
            return;
        }

        // Show verification view
        const display = document.getElementById('signup-verify-email-display');
        if (display) display.textContent = confirmedEmail;
        clearInput('signup-verify-code');
        showView('signup-verify-view');

        const sentMsg = document.getElementById('signup-verify-sent-message');
        if (sentMsg) {
            sentMsg.style.display = 'block';
            setTimeout(() => sentMsg.style.display = 'none', 5000);
        }

    } catch {
        alert('Could not reach the server. Please try again.');
    }
}

async function verifySignupCode() {
    const code = getInputValue('signup-verify-code');
    clearError('signup-verify-code');

    if (!code || code.length !== 6) {
        showError('signup-verify-code');
        alert('Please enter the 6-digit verification code.');
        return;
    }

    try {
        const res  = await apiCall('/api/verify-signup', 'POST', { email: confirmedEmail, code });
        const data = await res.json();

        if (!data.success) {
            showError('signup-verify-code');
            alert(data.message);
            return;
        }

        // Verified — proceed to password step
        const display = document.getElementById('signup-email-display');
        if (display) display.textContent = confirmedEmail;
        clearPasswordField('signup-password');
        clearPasswordField('signup-confirm-password');
        showView('signup-password-view');

    } catch {
        alert('Could not reach the server. Please try again.');
    }
}

async function resendVerificationCode() {
    if (!confirmedEmail) return;
    try {
        const res  = await apiCall('/api/send-verification', 'POST', { email: confirmedEmail });
        const data = await res.json();
        if (data.success) {
            const sentMsg = document.getElementById('signup-verify-sent-message');
            if (sentMsg) {
                sentMsg.style.display = 'block';
                setTimeout(() => sentMsg.style.display = 'none', 5000);
            }
        } else {
            alert(data.message);
        }
    } catch {
        alert('Could not reach the server. Please try again.');
    }
}

async function handleSignup() {
    const password        = getInputValue('signup-password');
    const confirmPassword = getInputValue('signup-confirm-password');

    clearError('signup-password');
    clearError('signup-confirm-password');

    if (password.length < 6) {
        showError('signup-password');
        alert('Password must be at least 6 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showError('signup-confirm-password');
        alert('Passwords do not match');
        return;
    }

    try {
        const res  = await apiCall('/api/signup', 'POST', {
            email:    confirmedEmail,
            password: password,
            role:     selectedRole || 'Teacher'
        });
        const data = await res.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        saveSession(data.token, data.user);
        fshNavigate('dashboard.html');

    } catch (err) {
        alert('Could not reach the server. Please try again.');
        console.error(err);
    }
}

// ============================================================================
// FORGOT PASSWORD (OTP stays client-side, reset hits the Worker)
// ============================================================================

async function sendOTP() {
    const email = getInputValue('forgot-email').toLowerCase();
    clearError('forgot-email');

    if (!validateEmailDomain(email)) {
        showError('forgot-email', 'Access Denied: Use school email');
        return;
    }

    try {
        const res  = await apiCall('/api/send-otp', 'POST', { email });
        const data = await res.json();

        if (!data.success) { alert(data.message); return; }

        otpData = { email };
        const display = document.getElementById('otp-email-display');
        if (display) display.textContent = email;

        clearInput('otp-code');
        showView('otp-view');

        // Show sent confirmation
        const sentMsg = document.getElementById('otp-sent-message');
        if (sentMsg) {
            sentMsg.style.display = 'block';
            setTimeout(() => sentMsg.style.display = 'none', 5000);
        }

    } catch {
        alert('Could not reach the server. Please try again.');
    }
}

async function verifyOTP() {
    const entered = getInputValue('otp-code');
    clearError('otp-code');

    if (!otpData?.email) {
        alert('No OTP request found. Please request a new code.');
        showView('forgot-password-view');
        return;
    }

    try {
        const res  = await apiCall('/api/verify-otp', 'POST', { email: otpData.email, code: entered });
        const data = await res.json();

        if (!data.success) { showError('otp-code'); alert(data.message); return; }

        const display = document.getElementById('reset-email-display');
        if (display) display.textContent = otpData.email;

        clearPasswordField('reset-password');
        clearPasswordField('reset-confirm-password');
        showView('reset-password-view');

    } catch {
        alert('Could not reach the server. Please try again.');
    }
}

async function resetPassword() {
    const newPassword     = getInputValue('reset-password');
    const confirmPassword = getInputValue('reset-confirm-password');

    clearError('reset-password');
    clearError('reset-confirm-password');

    if (newPassword.length < 6) {
        showError('reset-password');
        alert('Password must be at least 6 characters long');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('reset-confirm-password');
        alert('Passwords do not match');
        return;
    }

    if (!otpData) {
        alert('Session expired. Please start over.');
        showView('login-view');
        return;
    }

    try {
        const res  = await apiCall('/api/reset-password', 'POST', {
            email:        otpData.email,
            new_password: newPassword
        });
        const data = await res.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        otpData = null;
        alert('Password reset! Please login with your new password.');
        showView('login-view');

    } catch (err) {
        alert('Could not reach the server. Please try again.');
        console.error(err);
    }
}

async function resendOTP() {
    if (otpData?.email) {
        document.getElementById('forgot-email').value = otpData.email;
        await sendOTP();
    }
}

// Expose signup verification functions
window.verifySignupCode       = verifySignupCode;
window.resendVerificationCode = resendVerificationCode;

// ============================================================================
// LOGOUT
// ============================================================================

async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    await unsubscribePushNotifications();
    await apiCall('/api/logout', 'POST').catch(() => {});
    clearSession();
    localStorage.removeItem('fsh_last_unread_count'); // ← Clear notification count
    fshNavigate('index.html');
}

// ============================================================================
// SESSION GUARD — call on every protected page
// ============================================================================

async function requireSession() {
    const token = getToken();
    if (!token) {
        fshNavigate('index.html');
        return null;
    }

    try {
        const res  = await apiCall('/api/session', 'GET');
        const data = await res.json();

        if (!data.success) {
            clearSession();
            fshNavigate('index.html');
            return null;
        }

        // Keep localStorage display info in sync
        localStorage.setItem('fsh_user_email', data.user.email);
        localStorage.setItem('fsh_user_role',  data.user.role);
        return data.user;

    } catch {
        // Fallback: trust localStorage if server is unreachable
        const email = localStorage.getItem('fsh_user_email');
        const role  = localStorage.getItem('fsh_user_role');
        if (!email) { fshNavigate('index.html'); return null; }
        return { email, role };
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function validateEmailDomain(email) { return email.endsWith('@firstasia.edu.ph'); }
function generateOTP()              { return Math.floor(100000 + Math.random() * 900000).toString(); }
function getInputValue(id)          { return document.getElementById(id)?.value.trim() ?? ''; }

function clearInput(id) {
    const el = document.getElementById(id);
    if (el) { el.value = ''; clearError(id); }
}

function clearPasswordField(id) {
    clearInput(id);
    updatePasswordIconVisibility(id);
}

function showError(inputId, placeholderText = null) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.add('input-error');
    if (placeholderText) { input.value = ''; input.placeholder = placeholderText; }
}

function clearError(inputId) {
    document.getElementById(inputId)?.classList.remove('input-error');
}

function clearAllInputs() {
    document.querySelectorAll('.login-input').forEach(input => {
        input.classList.remove('input-error');
        input.value = '';
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.password-toggle').forEach(icon => {
        icon.style.display = 'none';
    });
    setupInputListeners();
});

function setupInputListeners() {
    const listeners = [
        { id: 'login-email',             onInput: () => clearError('login-email'),             onEnter: handleLogin },
        { id: 'login-password',          onInput: () => { clearError('login-password'); updatePasswordIconVisibility('login-password'); }, onEnter: handleLogin },
        { id: 'signup-email',            onInput: () => clearError('signup-email'),             onEnter: confirmEmail },
        { id: 'signup-password',         onInput: () => { clearError('signup-password'); updatePasswordIconVisibility('signup-password'); } },
        { id: 'signup-confirm-password', onInput: () => { clearError('signup-confirm-password'); updatePasswordIconVisibility('signup-confirm-password'); }, onEnter: handleSignup },
        { id: 'signup-verify-code',      onInput: () => clearError('signup-verify-code'),                                                                                onEnter: verifySignupCode },
        { id: 'forgot-email',            onInput: () => clearError('forgot-email'),             onEnter: sendOTP },
        { id: 'otp-code',                onInput: () => clearError('otp-code'),                 onEnter: verifyOTP },
        { id: 'reset-password',          onInput: () => { clearError('reset-password'); updatePasswordIconVisibility('reset-password'); } },
        { id: 'reset-confirm-password',  onInput: () => { clearError('reset-confirm-password'); updatePasswordIconVisibility('reset-confirm-password'); }, onEnter: resetPassword },
    ];

    listeners.forEach(({ id, onInput, onEnter }) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (onInput) el.addEventListener('input', onInput);
        if (onEnter) el.addEventListener('keydown', e => { if (e.key === 'Enter') onEnter(); });
    });
}