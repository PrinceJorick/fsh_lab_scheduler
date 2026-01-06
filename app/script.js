let selectedRole = "";

function handleSelection(clickedBtn) {
    const selectionView = document.getElementById('selection-view');
    const loginView = document.getElementById('login-view');
    const emailInput = document.querySelector('.login-input');

    selectedRole = clickedBtn.innerText;
    emailInput.placeholder = selectedRole === "Teacher" 
        ? "teachername@firstasia.edu.ph" 
        : "studentid@firstasia.edu.ph";

    selectionView.style.display = 'none';
    loginView.style.display = 'flex';
    loginView.classList.add('fade-in');

    setTimeout(() => {
        loginView.classList.remove('fade-in');
    }, 800);
}

function goBack() {
    const selectionView = document.getElementById('selection-view');
    const loginView = document.getElementById('login-view');
    const emailInput = document.querySelector('.login-input');

    // reset input state
    emailInput.classList.remove('input-error');
    emailInput.value = "";

    loginView.style.display = 'none';
    selectionView.style.display = 'flex';
    selectionView.classList.add('fade-in');

    setTimeout(() => {
        selectionView.classList.remove('fade-in');
    }, 800);
}

// logic for enter button
const enterBtn = document.querySelector('.enter-btn');
const emailInput = document.querySelector('.login-input');

enterBtn.addEventListener('click', () => {
    const email = emailInput.value.trim().toLowerCase();

    // check if school email
    if (!email.endsWith('@firstasia.edu.ph')) {
        
        // stop the redir and show error
        emailInput.classList.add('input-error');
        emailInput.value = ""; 
        emailInput.placeholder = "Access Denied: Use school email";
        
        console.log("Validation Failed: This is a " + email.split('@')[1] + " account.");

    } else {
        // if correct
        localStorage.setItem('fsh_user_email', email);
        localStorage.setItem('fsh_user_role', selectedRole);

        console.log("Login successful. Redirecting...");
        window.location.href = "scheduler.html"; 
    }
});

// remove error color when user types
emailInput.addEventListener('input', () => {
    emailInput.classList.remove('input-error');
});