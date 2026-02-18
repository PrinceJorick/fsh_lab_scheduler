// ============================================================================
// PROFILE.JS — Cloudflare Workers Version
// ============================================================================

const API_BASE = 'https://fsh-scheduler.medranowilljairuz.workers.dev'; // ← same as auth.js

// ── Token helpers (mirrors auth.js) ──────────────────────────────────────────
function getToken()     { return localStorage.getItem('fsh_token'); }
function clearSession() {
    localStorage.removeItem('fsh_token');
    localStorage.removeItem('fsh_user_email');
    localStorage.removeItem('fsh_user_role');
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const token   = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    return fetch(`${API_BASE}${endpoint}`, options);
}

async function requireSession() {
    const token = getToken();
    if (!token) { window.location.href = 'index.html'; return null; }

    try {
        const res  = await apiCall('/api/session', 'GET');
        const data = await res.json();
        if (!data.success) { clearSession(); window.location.href = 'index.html'; return null; }
        localStorage.setItem('fsh_user_email', data.user.email);
        localStorage.setItem('fsh_user_role',  data.user.role);
        return data.user;
    } catch {
        const email = localStorage.getItem('fsh_user_email');
        const role  = localStorage.getItem('fsh_user_role');
        if (!email) { window.location.href = 'index.html'; return null; }
        return { email, role };
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireSession();
    if (!user) return;

    loadProfileInfo(user.email, user.role);
    setupPasswordChangeForm();
    setupPasswordInputListeners();

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.innerText = `${user.email.split('@')[0]} (${user.role})`;
    }
});

// ============================================================================
// PROFILE DISPLAY
// ============================================================================

function loadProfileInfo(email, role) {
    const userName = email.split('@')[0];
    const formattedName = userName
        .split('.')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const profileName  = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole  = document.getElementById('profile-role');

    if (profileName)  profileName.textContent  = formattedName;
    if (profileEmail) profileEmail.textContent = email;
    if (profileRole)  profileRole.textContent  = role;
}

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

function showChangePassword() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('change-password-form')?.reset();
        clearAllPasswordErrors();
        hideAllPasswordToggles();
    }
}

function closeChangePassword() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('change-password-form')?.reset();
        clearAllPasswordErrors();
        hideAllPasswordToggles();
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('change-password-modal');
    if (event.target === modal) closeChangePassword();
};

function setupPasswordChangeForm() {
    document.getElementById('change-password-form')
        ?.addEventListener('submit', handlePasswordChange);
}

async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword     = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    clearAllPasswordErrors();

    if (newPassword.length < 6) {
        showPasswordError('new-password');
        alert('New password must be at least 6 characters long');
        return;
    }

    if (newPassword !== confirmPassword) {
        showPasswordError('confirm-new-password');
        alert('New passwords do not match');
        return;
    }

    if (newPassword === currentPassword) {
        showPasswordError('new-password');
        alert('New password must be different from current password');
        return;
    }

    try {
        const res  = await apiCall('/api/change-password', 'POST', {
            current_password: currentPassword,
            new_password:     newPassword
        });
        const data = await res.json();

        if (!data.success) {
            if (data.message.includes('incorrect')) showPasswordError('current-password');
            alert(data.message);
            return;
        }

        alert('Password changed successfully!');
        closeChangePassword();

    } catch (err) {
        alert('Could not reach the server. Please try again.');
        console.error(err);
    }
}

// ============================================================================
// UTILITY
// ============================================================================

function setupPasswordInputListeners() {
    ['current-password', 'new-password', 'confirm-new-password'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            clearPasswordError(id);
            updatePasswordIconVisibility(id);
        });
    });
}

function showPasswordError(id)   { document.getElementById(id)?.classList.add('input-error'); }
function clearPasswordError(id)  { document.getElementById(id)?.classList.remove('input-error'); }
function clearAllPasswordErrors(){ ['current-password', 'new-password', 'confirm-new-password'].forEach(clearPasswordError); }
function hideAllPasswordToggles(){ document.querySelectorAll('#change-password-modal .password-toggle').forEach(t => t.style.display = 'none'); }
function updatePasswordIconVisibility(id) {
    const input = document.getElementById(id);
    const icon  = input?.parentElement.querySelector('.password-toggle');
    if (input && icon) icon.style.display = input.value.length > 0 ? 'block' : 'none';
}

function goBackToDashboard() { window.location.href = 'dashboard.html'; }

async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    await unsubscribePushNotifications();
    await apiCall('/api/logout', 'POST').catch(() => {});
    clearSession();
    localStorage.removeItem('fsh_last_unread_count'); // ← Clear notification count
    window.location.href = 'index.html';
}

window.showChangePassword  = showChangePassword;
window.closeChangePassword = closeChangePassword;
window.goBackToDashboard   = goBackToDashboard;
window.logout              = logout;