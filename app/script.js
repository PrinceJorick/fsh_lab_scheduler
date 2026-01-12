let selectedRole = "";

// --- LOGIN PAGE LOGIC ---
function handleSelection(clickedBtn) {
    const selectionView = document.getElementById('selection-view');
    const loginView = document.getElementById('login-view');
    const emailInput = document.querySelector('.login-input');

    if (!selectionView || !loginView) return; // safety check

    selectedRole = clickedBtn.innerText;
    emailInput.placeholder = selectedRole === "Teacher" 
        ? "teachername@firstasia.edu.ph" 
        : "studentid@firstasia.edu.ph";

    selectionView.style.display = 'none';
    loginView.style.display = 'flex';
    loginView.classList.add('fade-in');

    setTimeout(() => loginView.classList.remove('fade-in'), 800);
}

function goBack() {
    const selectionView = document.getElementById('selection-view');
    const loginView = document.getElementById('login-view');
    const emailInput = document.querySelector('.login-input');

    if (emailInput) {
        emailInput.classList.remove('input-error');
        emailInput.value = "";
    }

    loginView.style.display = 'none';
    selectionView.style.display = 'flex';
    selectionView.classList.add('fade-in');

    setTimeout(() => selectionView.classList.remove('fade-in'), 800);
}

// logic for Enter Button
const enterBtn = document.querySelector('.enter-btn');
const emailInput = document.querySelector('.login-input');

if (enterBtn && emailInput) {
    enterBtn.addEventListener('click', () => {
        const email = emailInput.value.trim().toLowerCase();

        if (!email.endsWith('@firstasia.edu.ph')) {
            emailInput.classList.add('input-error');
            emailInput.value = ""; 
            emailInput.placeholder = "Access Denied: Use school email";
            console.log("Validation Failed.");
        } else {
            localStorage.setItem('fsh_user_email', email);
            localStorage.setItem('fsh_user_role', selectedRole);
            window.location.href = "dashboard.html"; 
        }
    });

    emailInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            enterBtn.click(); // This triggers the click listener you already wrote
        }
    });

    emailInput.addEventListener('input', () => {
        emailInput.classList.remove('input-error');
    });
}

// --- DASHBOARD PAGE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
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