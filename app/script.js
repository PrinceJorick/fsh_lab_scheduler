let selectedRole = "";
let confirmedEmail = ""; // Store the confirmed email for step 2

// --- LOGIN PAGE LOGIC ---
function handleSelection(clickedBtn) {
    const selectionView = document.getElementById('selection-view');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const signupPasswordView = document.getElementById('signup-password-view');
    const emailInput = document.querySelector('#login-email');
    const loginPasswordInput = document.querySelector('#login-password');

    if (!selectionView || !loginView) return; // safety check

    selectedRole = clickedBtn.innerText;
    emailInput.placeholder = selectedRole === "Teacher" 
        ? "teachername@firstasia.edu.ph" 
        : "studentid@firstasia.edu.ph";

    // Clear login password and hide icon
    if (loginPasswordInput) {
        loginPasswordInput.value = '';
        updatePasswordIconVisibility('login-password');
    }

    selectionView.style.display = 'none';
    loginView.style.display = 'flex';
    if (signupView) signupView.style.display = 'none';
    if (signupPasswordView) signupPasswordView.style.display = 'none';
    loginView.classList.add('fade-in');

    setTimeout(() => loginView.classList.remove('fade-in'), 800);
}

function goBack() {
    const selectionView = document.getElementById('selection-view');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const signupPasswordView = document.getElementById('signup-password-view');
    
    // Clear all inputs
    const allInputs = document.querySelectorAll('.login-input');
    allInputs.forEach(input => {
        input.classList.remove('input-error');
        input.value = "";
    });

    // Reset confirmed email
    confirmedEmail = "";

    loginView.style.display = 'none';
    if (signupView) signupView.style.display = 'none';
    if (signupPasswordView) signupPasswordView.style.display = 'none';
    selectionView.style.display = 'flex';
    selectionView.classList.add('fade-in');

    setTimeout(() => selectionView.classList.remove('fade-in'), 800);
}

// --- PASSWORD TOGGLE FUNCTION ---
function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    
    // Determine which page we're on and get both password fields
    let otherInputId, otherIcon;
    
    if (inputId === 'login-password') {
        // Only one password field on login
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    } else {
        // Signup has two password fields - sync them
        if (inputId === 'signup-password') {
            otherInputId = 'signup-confirm-password';
        } else {
            otherInputId = 'signup-password';
        }
        
        const otherInput = document.getElementById(otherInputId);
        const otherIconElement = otherInput.parentElement.querySelector('.password-toggle');
        
        // Toggle both fields together
        if (input.type === 'password') {
            input.type = 'text';
            otherInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            otherIconElement.classList.remove('fa-eye');
            otherIconElement.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            otherInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            otherIconElement.classList.remove('fa-eye-slash');
            otherIconElement.classList.add('fa-eye');
        }
    }
}

// Show/hide eye icons based on input content
function updatePasswordIconVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.password-toggle');
    
    if (input && icon) {
        if (input.value.length > 0) {
            icon.style.display = 'block';
        } else {
            icon.style.display = 'none';
        }
    }
}

// --- SIGN UP FUNCTIONS ---
function showSignup() {
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const signupPasswordView = document.getElementById('signup-password-view');
    const loginPasswordInput = document.querySelector('#login-password');
    
    if (!signupView) return;
    
    // Clear login password and hide icon
    if (loginPasswordInput) {
        loginPasswordInput.value = '';
        updatePasswordIconVisibility('login-password');
    }
    
    // Update placeholder based on selected role
    const signupEmailInput = document.getElementById('signup-email');
    if (signupEmailInput) {
        signupEmailInput.placeholder = selectedRole === "Teacher" 
            ? "teachername@firstasia.edu.ph" 
            : "studentid@firstasia.edu.ph";
    }
    
    loginView.style.display = 'none';
    signupView.style.display = 'flex';
    if (signupPasswordView) signupPasswordView.style.display = 'none';
    signupView.classList.add('fade-in');
    
    setTimeout(() => signupView.classList.remove('fade-in'), 800);
}

function showLoginFromSignup() {
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const signupPasswordView = document.getElementById('signup-password-view');
    const loginPasswordInput = document.querySelector('#login-password');
    
    if (!loginView) return;
    
    // Clear login password and hide icon
    if (loginPasswordInput) {
        loginPasswordInput.value = '';
        updatePasswordIconVisibility('login-password');
    }
    
    signupView.style.display = 'none';
    if (signupPasswordView) signupPasswordView.style.display = 'none';
    loginView.style.display = 'flex';
    loginView.classList.add('fade-in');
    
    // Reset confirmed email
    confirmedEmail = "";
    
    setTimeout(() => loginView.classList.remove('fade-in'), 800);
}

// Step 1: Confirm Email
function confirmEmail() {
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const emailInput = document.getElementById('signup-email');
    
    // Remove previous error state
    emailInput.classList.remove('input-error');
    
    // Validate email domain
    if (!email.endsWith('@firstasia.edu.ph')) {
        emailInput.classList.add('input-error');
        emailInput.value = "";
        emailInput.placeholder = "Access Denied: Use school email";
        return;
    }
    
    // Check if user already exists
    const existingUser = localStorage.getItem('user_' + email);
    if (existingUser) {
        emailInput.classList.add('input-error');
        alert('An account with this email already exists. Please sign in.');
        return;
    }
    
    // Email is valid, move to password step
    confirmedEmail = email;
    
    const signupView = document.getElementById('signup-view');
    const signupPasswordView = document.getElementById('signup-password-view');
    const emailDisplay = document.getElementById('signup-email-display');
    
    if (emailDisplay) {
        emailDisplay.textContent = confirmedEmail;
    }
    
    // Clear password fields and hide icons
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');
    if (passwordInput) {
        passwordInput.value = '';
        updatePasswordIconVisibility('signup-password');
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.value = '';
        updatePasswordIconVisibility('signup-confirm-password');
    }
    
    signupView.style.display = 'none';
    signupPasswordView.style.display = 'flex';
    signupPasswordView.classList.add('fade-in');
    
    setTimeout(() => signupPasswordView.classList.remove('fade-in'), 800);
}

// Step 2: Create Password
function handleSignup() {
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');
    
    // Remove previous error states
    passwordInput.classList.remove('input-error');
    confirmPasswordInput.classList.remove('input-error');
    
    // Validate password length
    if (password.length < 6) {
        passwordInput.classList.add('input-error');
        alert('Password must be at least 6 characters long');
        return;
    }
    
    // Validate passwords match
    if (password !== confirmPassword) {
        confirmPasswordInput.classList.add('input-error');
        alert('Passwords do not match');
        return;
    }
    
    // Store user data
    const userData = {
        email: confirmedEmail,
        password: password,
        role: selectedRole,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('user_' + confirmedEmail, JSON.stringify(userData));
    
    // Set current user and redirect
    localStorage.setItem('fsh_user_email', confirmedEmail);
    localStorage.setItem('fsh_user_role', selectedRole);
    
    window.location.href = "dashboard.html";
}

// Go back to email step
function backToEmailStep() {
    const signupView = document.getElementById('signup-view');
    const signupPasswordView = document.getElementById('signup-password-view');
    
    // Clear password inputs and hide icons
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');
    
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.classList.remove('input-error');
        updatePasswordIconVisibility('signup-password');
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.value = '';
        confirmPasswordInput.classList.remove('input-error');
        updatePasswordIconVisibility('signup-confirm-password');
    }
    
    signupPasswordView.style.display = 'none';
    signupView.style.display = 'flex';
    signupView.classList.add('fade-in');
    
    setTimeout(() => signupView.classList.remove('fade-in'), 800);
}

// --- LOGIN LOGIC (Updated) ---
const enterBtn = document.querySelector('.enter-btn');
const emailInput = document.querySelector('#login-email');
const passwordInput = document.querySelector('#login-password');

if (enterBtn && emailInput) {
    enterBtn.addEventListener('click', () => {
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput ? passwordInput.value : '';

        // Remove previous errors
        emailInput.classList.remove('input-error');
        if (passwordInput) passwordInput.classList.remove('input-error');

        // Validate email domain
        if (!email.endsWith('@firstasia.edu.ph')) {
            emailInput.classList.add('input-error');
            emailInput.value = ""; 
            emailInput.placeholder = "Access Denied: Use school email";
            return;
        }

        // If password field exists, validate login
        if (passwordInput) {
            const storedUser = localStorage.getItem('user_' + email);
            
            if (!storedUser) {
                emailInput.classList.add('input-error');
                alert('No account found. Please sign up first.');
                return;
            }
            
            const userData = JSON.parse(storedUser);
            
            if (userData.password !== password) {
                passwordInput.classList.add('input-error');
                alert('Incorrect password');
                return;
            }
            
            // Use stored role
            selectedRole = userData.role;
        }

        // Success - store and redirect
        localStorage.setItem('fsh_user_email', email);
        localStorage.setItem('fsh_user_role', selectedRole);
        window.location.href = "dashboard.html"; 
    });

    emailInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            enterBtn.click();
        }
    });

    emailInput.addEventListener('input', () => {
        emailInput.classList.remove('input-error');
    });
}

// Add input listeners for signup fields
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');

if (signupEmailInput) {
    signupEmailInput.addEventListener('input', () => {
        signupEmailInput.classList.remove('input-error');
    });
    
    signupEmailInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            confirmEmail();
        }
    });
}

if (signupPasswordInput) {
    signupPasswordInput.addEventListener('input', () => {
        signupPasswordInput.classList.remove('input-error');
        updatePasswordIconVisibility('signup-password');
    });
}

if (signupConfirmPasswordInput) {
    signupConfirmPasswordInput.addEventListener('input', () => {
        signupConfirmPasswordInput.classList.remove('input-error');
        updatePasswordIconVisibility('signup-confirm-password');
    });
    
    signupConfirmPasswordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleSignup();
        }
    });
}

// Add listener for login password field
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        updatePasswordIconVisibility('login-password');
    });
}

// --- DASHBOARD PAGE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    // Hide all password toggle icons on page load
    const allPasswordToggles = document.querySelectorAll('.password-toggle');
    allPasswordToggles.forEach(icon => {
        icon.style.display = 'none';
    });
    
    // only run if on scheduler page
    if (window.location.pathname.includes("dashboard.html")) {
        const email = localStorage.getItem('fsh_user_email');
        const role = localStorage.getItem('fsh_user_role');

        // security check
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
});

// global functions
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

function selectLab(labName) {
    console.log("Lab selected: " + labName);
    // future thing, disregard for now; window.location.href = `booking.html?lab=${labName}`;
}

// --- GOOGLE SIGN-IN IMPLEMENTATION ---

function handleCredentialResponse(response) {
    // 1. Decode the Google JWT (JSON Web Token) to get user info
    const responsePayload = decodeJwtResponse(response.credential);

    console.log("ID: " + responsePayload.sub);
    console.log("Email: " + responsePayload.email);

    // 2. Validate Domain (matches your existing logic)
    // Note: 'hd' stands for Hosted Domain (e.g., firstasia.edu.ph)
    if (responsePayload.hd !== 'firstasia.edu.ph') {
        alert("Access Denied: Please sign in with your school email (@firstasia.edu.ph).");
        return;
    }

    // 3. Save to Local Storage (reusing your existing app logic)
    // We use the global 'selectedRole' variable you defined at the top of script.js
    if (!selectedRole) {
        selectedRole = "Student"; // Default fallback if they didn't click a toggle
    }

    localStorage.setItem('fsh_user_email', responsePayload.email);
    localStorage.setItem('fsh_user_role', selectedRole);

    // 4. Redirect to Dashboard
    window.location.href = "dashboard.html";
}

// Helper function to decode the JWT token from Google
function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Initialize Google Button when the page loads
window.onload = function () {
    const buttonDivLogin = document.getElementById("buttonDiv-login");
    const buttonDivSignup = document.getElementById("buttonDiv-signup");
    
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "238536479920-v18ac5qcfh6t0vmp8evjk381g4b6ssl4.apps.googleusercontent.com",
            callback: handleCredentialResponse
        });
        
        // Render button in login view
        if (buttonDivLogin) {
            google.accounts.id.renderButton(
                buttonDivLogin,
                { 
                    theme: "filled_black",
                    size: "large", 
                    shape: "pill",
                    width: "320"
                } 
            );
        }
        
        // Render button in signup view
        if (buttonDivSignup) {
            google.accounts.id.renderButton(
                buttonDivSignup,
                { 
                    theme: "filled_black",
                    size: "large", 
                    shape: "pill",
                    width: "320"
                } 
            );
        }
        
        google.accounts.id.prompt(); 
    }
};