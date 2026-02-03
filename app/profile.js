// ============================================================================
// PROFILE.JS - Profile Management & Password Change
// ============================================================================

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
    
    // Load profile information
    loadProfileInfo(email, role);
    
    // Setup form handlers
    setupPasswordChangeForm();
    setupPasswordInputListeners();
    
    // Update user display in nav
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        const userName = email.split('@')[0];
        userDisplay.innerText = `${userName} (${role})`;
    }
});

// ============================================================================
// PROFILE INFORMATION
// ============================================================================

function loadProfileInfo(email, role) {
    // Extract username from email
    const userName = email.split('@')[0];
    
    // Format name (capitalize first letter of each word)
    const formattedName = userName
        .split('.')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    // Update profile display
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileRole = document.getElementById('profile-role');
    
    if (profileName) profileName.textContent = formattedName;
    if (profileEmail) profileEmail.textContent = email;
    if (profileRole) profileRole.textContent = role;
}

// ============================================================================
// CHANGE PASSWORD MODAL
// ============================================================================

function showChangePassword() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear form
        document.getElementById('change-password-form')?.reset();
        clearAllPasswordErrors();
        hideAllPasswordToggles();
    }
}

function closeChangePassword() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'none';
        // Clear form
        document.getElementById('change-password-form')?.reset();
        clearAllPasswordErrors();
        hideAllPasswordToggles();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('change-password-modal');
    if (event.target === modal) {
        closeChangePassword();
    }
}

// ============================================================================
// PASSWORD CHANGE LOGIC
// ============================================================================

function setupPasswordChangeForm() {
    const form = document.getElementById('change-password-form');
    if (form) {
        form.addEventListener('submit', handlePasswordChange);
    }
}

function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    
    // Clear previous errors
    clearAllPasswordErrors();
    
    // Get user data
    const email = localStorage.getItem('fsh_user_email');
    const userData = getUserData(email);
    
    if (!userData) {
        alert('User data not found. Please login again.');
        logout();
        return;
    }
    
    // Verify current password
    if (userData.password !== currentPassword) {
        showPasswordError('current-password');
        alert('Current password is incorrect');
        return;
    }
    
    // Validate new password
    if (newPassword.length < 6) {
        showPasswordError('new-password');
        alert('New password must be at least 6 characters long');
        return;
    }
    
    // Check if new password matches confirmation
    if (newPassword !== confirmPassword) {
        showPasswordError('confirm-new-password');
        alert('New passwords do not match');
        return;
    }
    
    // Check if new password is different from current
    if (newPassword === currentPassword) {
        showPasswordError('new-password');
        alert('New password must be different from current password');
        return;
    }
    
    // Update password
    userData.password = newPassword;
    saveUserData(email, userData);
    
    // Show success message
    alert('Password changed successfully!');
    
    // Close modal and reset form
    closeChangePassword();
}

// ============================================================================
// PASSWORD INPUT LISTENERS
// ============================================================================

function setupPasswordInputListeners() {
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-new-password');
    
    if (currentPassword) {
        currentPassword.addEventListener('input', () => {
            clearPasswordError('current-password');
            updatePasswordIconVisibility('current-password');
        });
    }
    
    if (newPassword) {
        newPassword.addEventListener('input', () => {
            clearPasswordError('new-password');
            updatePasswordIconVisibility('new-password');
        });
    }
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            clearPasswordError('confirm-new-password');
            updatePasswordIconVisibility('confirm-new-password');
        });
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getUserData(email) {
    const data = localStorage.getItem('user_' + email);
    return data ? JSON.parse(data) : null;
}

function saveUserData(email, userData) {
    localStorage.setItem('user_' + email, JSON.stringify(userData));
}

function showPasswordError(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.add('input-error');
    }
}

function clearPasswordError(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.remove('input-error');
    }
}

function clearAllPasswordErrors() {
    const inputs = ['current-password', 'new-password', 'confirm-new-password'];
    inputs.forEach(id => clearPasswordError(id));
}

function hideAllPasswordToggles() {
    const toggles = document.querySelectorAll('#change-password-modal .password-toggle');
    toggles.forEach(toggle => {
        toggle.style.display = 'none';
    });
}

function updatePasswordIconVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input?.parentElement.querySelector('.password-toggle');
    
    if (input && icon) {
        icon.style.display = input.value.length > 0 ? 'block' : 'none';
    }
}

function goBackToDashboard() {
    window.location.href = 'dashboard.html';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('fsh_user_email');
        localStorage.removeItem('fsh_user_role');
        window.location.href = 'index.html';
    }
}

// Make functions globally available
window.showChangePassword = showChangePassword;
window.closeChangePassword = closeChangePassword;
window.goBackToDashboard = goBackToDashboard;
window.logout = logout;
