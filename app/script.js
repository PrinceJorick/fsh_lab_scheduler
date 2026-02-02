/* app/script.js */

/**
 * Service to handle data storage and authentication.
 * NOTE: LocalStorage is used for prototyping. In production, use a real backend.
 */
const AuthService = {
    SCHOOL_DOMAIN: '@firstasia.edu.ph',
    
    isValidEmail(email) {
        return email.endsWith(this.SCHOOL_DOMAIN);
    },

    getUser(email) {
        return JSON.parse(localStorage.getItem('user_' + email));
    },

    registerUser(email, password, role) {
        const userData = {
            email,
            password,
            role,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('user_' + email, JSON.stringify(userData));
        this.setSession(email, role);
    },

    loginUser(email, password) {
        const user = this.getUser(email);
        if (!user) return { success: false, message: 'No account found. Please sign up.' };
        if (user.password !== password) return { success: false, message: 'Incorrect password.' };
        
        this.setSession(user.email, user.role);
        return { success: true };
    },

    setSession(email, role) {
        localStorage.setItem('fsh_user_email', email);
        localStorage.setItem('fsh_user_role', role);
    },

    getSession() {
        return {
            email: localStorage.getItem('fsh_user_email'),
            role: localStorage.getItem('fsh_user_role')
        };
    },

    logout() {
        localStorage.removeItem('fsh_user_email');
        localStorage.removeItem('fsh_user_role');
        window.location.href = "index.html";
    }
};

/**
 * Handles UI transitions and Form Interactions
 */
const UIManager = {
    selectedRole: 'Student', // Default
    signupEmail: '',

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.checkPageContext();
    },

    cacheDOM() {
        // Views
        this.views = {
            selection: document.getElementById('selection-view'),
            login: document.getElementById('login-view'),
            signup: document.getElementById('signup-view'),
            signupPass: document.getElementById('signup-password-view')
        };

        // Inputs
        this.inputs = {
            loginEmail: document.getElementById('login-email'),
            loginPass: document.getElementById('login-password'),
            signupEmail: document.getElementById('signup-email'),
            signupPass: document.getElementById('signup-password'),
            signupConfirm: document.getElementById('signup-confirm-password')
        };

        // Display Elements
        this.display = {
            signupEmail: document.getElementById('signup-email-display'),
            userDisplay: document.getElementById('user-display')
        };
    },

    bindEvents() {
        // Global clicks (using delegation or direct binding if IDs exist)
        document.querySelectorAll('.role-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRoleSelection(e.target.innerText));
        });

        // Toggle Password Visibility
        document.querySelectorAll('.password-toggle').forEach(icon => {
            icon.addEventListener('click', (e) => this.togglePasswordVisibility(e.target));
        });

        // Input Monitors (to hide/show eye icon and clear errors)
        Object.values(this.inputs).forEach(input => {
            if(!input) return;
            input.addEventListener('input', (e) => {
                e.target.classList.remove('input-error');
                this.updateEyeIcon(e.target);
            });
        });

        // Buttons (Using IDs assigned in HTML)
        const btnLogin = document.getElementById('btn-login-continue');
        if (btnLogin) btnLogin.addEventListener('click', () => this.handleLogin());

        const btnSignupEmail = document.getElementById('btn-signup-email-continue');
        if (btnSignupEmail) btnSignupEmail.addEventListener('click', () => this.handleSignupEmail());

        const btnSignupCreate = document.getElementById('btn-signup-create');
        if (btnSignupCreate) btnSignupCreate.addEventListener('click', () => this.handleSignupFinalize());

        // Navigation Buttons
        document.querySelectorAll('.btn-show-signup').forEach(b => b.addEventListener('click', () => this.switchView('signup')));
        document.querySelectorAll('.btn-show-login').forEach(b => b.addEventListener('click', () => this.switchView('login')));
        document.querySelectorAll('.btn-go-back').forEach(b => b.addEventListener('click', (e) => this.handleBack(e)));

        // Lab Cards
        document.querySelectorAll('.lab-card').forEach(card => {
            card.addEventListener('click', () => {
                const labName = card.querySelector('h3').innerText;
                console.log(`Lab Selected: ${labName}`);
                // window.location.href = `booking.html?lab=${encodeURIComponent(labName)}`;
            });
        });
    },

    checkPageContext() {
        if (window.location.pathname.includes('dashboard.html')) {
            const session = AuthService.getSession();
            if (!session.email) {
                window.location.href = 'index.html';
                return;
            }
            if (this.display.userDisplay) {
                const name = session.email.split('@')[0];
                this.display.userDisplay.innerText = `${name} (${session.role})`;
            }
        }
    },

    // --- Actions ---

    handleRoleSelection(role) {
        this.selectedRole = role;
        if (this.inputs.loginEmail) this.inputs.loginEmail.placeholder = "usernameid@firstasia.edu.ph";
        this.switchView('login');
    },

    handleLogin() {
        const email = this.inputs.loginEmail.value.trim().toLowerCase();
        const pass = this.inputs.loginPass.value;

        if (!AuthService.isValidEmail(email)) {
            this.showError(this.inputs.loginEmail, "Access Denied: Use school email");
            return;
        }

        const result = AuthService.loginUser(email, pass);
        if (result.success) {
            window.location.href = "dashboard.html";
        } else {
            this.showError(result.message.includes('password') ? this.inputs.loginPass : this.inputs.loginEmail, result.message);
        }
    },

    handleSignupEmail() {
        const email = this.inputs.signupEmail.value.trim().toLowerCase();
        if (!AuthService.isValidEmail(email)) {
            this.showError(this.inputs.signupEmail, "Access Denied: Use school email");
            return;
        }
        if (AuthService.getUser(email)) {
            this.showError(this.inputs.signupEmail, "Account exists. Please sign in.");
            return;
        }

        this.signupEmail = email;
        if (this.display.signupEmail) this.display.signupEmail.innerText = email;
        this.switchView('signupPass');
    },

    handleSignupFinalize() {
        const pass = this.inputs.signupPass.value;
        const confirm = this.inputs.signupConfirm.value;

        if (pass.length < 6) {
            this.showError(this.inputs.signupPass, "Password too short (min 6 chars)");
            return;
        }
        if (pass !== confirm) {
            this.showError(this.inputs.signupConfirm, "Passwords do not match");
            return;
        }

        AuthService.registerUser(this.signupEmail, pass, this.selectedRole);
        window.location.href = "dashboard.html";
    },

    handleBack(e) {
        // Logic to determine where 'back' goes based on current visibility
        if (this.views.signupPass.style.display === 'flex') {
            this.switchView('signup');
        } else {
            this.switchView('selection');
            this.resetForms();
        }
    },

    // --- Helpers ---

    switchView(viewName) {
        // Hide all
        Object.values(this.views).forEach(el => { if(el) el.style.display = 'none'; });
        
        // Show target
        const target = this.views[viewName];
        if (target) {
            target.style.display = 'flex';
            target.classList.add('fade-in');
            setTimeout(() => target.classList.remove('fade-in'), 800);
        }
    },

    resetForms() {
        Object.values(this.inputs).forEach(input => {
            if(input) {
                input.value = '';
                input.classList.remove('input-error');
            }
        });
        document.querySelectorAll('.password-toggle').forEach(el => el.style.display = 'none');
    },

    showError(inputElement, msg) {
        inputElement.classList.add('input-error');
        if(msg) alert(msg); // Ideally replace with a UI toast/text element
    },

    togglePasswordVisibility(iconElement) {
        const container = iconElement.parentElement;
        const input = container.querySelector('input');
        
        if (input.type === 'password') {
            input.type = 'text';
            iconElement.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            iconElement.classList.replace('fa-eye-slash', 'fa-eye');
        }
    },

    updateEyeIcon(input) {
        const icon = input.parentElement.querySelector('.password-toggle');
        if (icon) icon.style.display = input.value.length > 0 ? 'block' : 'none';
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    UIManager.init();
});


// --- Google Sign-In Integration ---
window.handleCredentialResponse = function(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    
    if (responsePayload.hd !== 'firstasia.edu.ph') {
        alert("Access Denied: Please sign in with your school email (@firstasia.edu.ph).");
        return;
    }

    AuthService.setSession(responsePayload.email, UIManager.selectedRole);
    window.location.href = "dashboard.html";
};

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

window.onload = function () {
    if (typeof google !== 'undefined' && document.getElementById("buttonDiv-login")) {
        google.accounts.id.initialize({
            client_id: "238536479920-v18ac5qcfh6t0vmp8evjk381g4b6ssl4.apps.googleusercontent.com",
            callback: handleCredentialResponse
        });
        
        const renderConfig = { theme: "filled_black", size: "large", shape: "pill", width: "320" };
        
        const loginDiv = document.getElementById("buttonDiv-login");
        if(loginDiv) google.accounts.id.renderButton(loginDiv, renderConfig);
        
        const signupDiv = document.getElementById("buttonDiv-signup");
        if(signupDiv) google.accounts.id.renderButton(signupDiv, renderConfig);
    }
};