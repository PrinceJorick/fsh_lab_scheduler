// ============================================================================
// GOOGLE-AUTH.JS - Google Sign-In Integration
// ============================================================================

// ============================================================================
// GOOGLE SIGN-IN HANDLER
// ============================================================================

async function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);

    if (responsePayload.hd !== 'firstasia.edu.ph') {
        alert("Access Denied: Please sign in with your school email (@firstasia.edu.ph).");
        return;
    }

    if (!selectedRole) selectedRole = "Teacher";

    const API_BASE = 'https://fsh-scheduler.medranowilljairuz.workers.dev';

    try {
        let res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: responsePayload.email,
                password: responsePayload.sub
            })
        });
        let data = await res.json();

        if (!data.success && data.message.includes('No account')) {
            res = await fetch(`${API_BASE}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email:    responsePayload.email,
                    password: responsePayload.sub,
                    role:     selectedRole
                })
            });
            data = await res.json();
        }

        if (!data.success) {
            alert("Sign-in failed: " + data.message);
            return;
        }

        localStorage.setItem('fsh_token',      data.token);
        localStorage.setItem('fsh_user_email', data.user.email);
        localStorage.setItem('fsh_user_role',  data.user.role);
        window.location.href = "dashboard.html";

    } catch (err) {
        alert("Could not reach the server. Please try again.");
        console.error(err);
    }
}

// ============================================================================
// JWT DECODER
// ============================================================================

function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        window.atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );

    return JSON.parse(jsonPayload);
}

// ============================================================================
// GOOGLE BUTTON INITIALIZATION
// ============================================================================

function getGoogleButtonTheme() {
    const savedTheme = localStorage.getItem('fsh_theme') || 'light';
    return savedTheme === 'dark' ? 'outline' : 'filled_black';
}

function renderGoogleButtons() {
    if (typeof google === 'undefined') return;

    const buttonDivLogin  = document.getElementById("buttonDiv-login");
    const buttonDivSignup = document.getElementById("buttonDiv-signup");
    const theme = getGoogleButtonTheme();

    const referenceEl = buttonDivLogin || buttonDivSignup;
    const measured = referenceEl
        ? Math.floor(referenceEl.getBoundingClientRect().width) || referenceEl.offsetWidth
        : 0;

    // Use measured width, but never pass 0 â€” fall back to 400 so Google always renders
    const containerWidth = measured > 0 ? measured : 400;

    const buttonConfig = {
        theme: theme,
        size: "large",
        shape: "pill",
        type: "standard",
        text: "signin_with",
        logo_alignment: "left",
        width: containerWidth
    };

    if (buttonDivLogin) {
        buttonDivLogin.innerHTML = '';
        google.accounts.id.renderButton(buttonDivLogin, { ...buttonConfig });
    }

    if (buttonDivSignup) {
        buttonDivSignup.innerHTML = '';
        google.accounts.id.renderButton(buttonDivSignup, { ...buttonConfig });
    }
}

window.onload = function () {
    if (typeof google === 'undefined') return;

    // 1. Initialize first
    google.accounts.id.initialize({
        client_id: "238536479920-v18ac5qcfh6t0vmp8evjk381g4b6ssl4.apps.googleusercontent.com",
        callback: handleCredentialResponse,
        hosted_domain: "firstasia.edu.ph"
    });

    // 2. Render the button immediately (uses 400px fallback if layout not ready)
    renderGoogleButtons();

    // 3. Re-render once layout is fully painted to get the exact container width
    requestAnimationFrame(() => setTimeout(renderGoogleButtons, 150));

    // 4. Prompt AFTER button is rendered so Google can show personalized button
    setTimeout(() => google.accounts.id.prompt(), 200);

    // Re-render buttons whenever the theme toggle is clicked
    document.addEventListener('click', function (e) {
        if (e.target.closest('.theme-toggle')) {
            setTimeout(renderGoogleButtons, 50);
        }
    });

    // Re-render if the container is resized (e.g. window resize / mobile rotation)
    const observerTarget = document.getElementById("buttonDiv-login")
                        || document.getElementById("buttonDiv-signup");
    if (observerTarget && window.ResizeObserver) {
        new ResizeObserver(() => setTimeout(renderGoogleButtons, 50))
            .observe(observerTarget.parentElement || observerTarget);
    }
};