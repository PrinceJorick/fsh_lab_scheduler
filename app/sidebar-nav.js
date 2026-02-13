// ============================================================================
// SIDEBAR-NAV.JS - Pull Tab Sidebar Navigation + Dark Mode Toggle
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    initializeDarkMode();
    initializeMailButton();
    
    // Add page identifier to body for page-specific styling
    const path = window.location.pathname;
    if (path.includes('laboratory.html')) {
        document.body.setAttribute('data-page', 'laboratory');
    } else if (path.includes('mail.html')) {
        document.body.setAttribute('data-page', 'mail');
    } else if (path.includes('profile.html')) {
        document.body.setAttribute('data-page', 'profile');
    } else if (path.includes('dashboard.html')) {
        document.body.setAttribute('data-page', 'dashboard');
    }
});

function initializeSidebar() {
    // Create hamburger button
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.setAttribute('aria-label', 'Toggle Menu');
    
    // Add hamburger icon
    menuToggle.innerHTML = `<i class="fas fa-bars"></i>`;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    
    // Insert elements into DOM - hamburger goes in dashboard-container, overlay in body
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.insertBefore(menuToggle, dashboardContainer.firstChild);
    } else {
        document.body.insertBefore(menuToggle, document.body.firstChild);
    }
    document.body.insertBefore(overlay, document.body.firstChild);
    
    const dashNav = document.querySelector('.dash-nav');
    
    // Toggle sidebar function
    function toggleSidebar() {
        const isActive = dashNav.classList.contains('active');
        
        if (isActive) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
    
    function openSidebar() {
        dashNav.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('menu-open');
        menuToggle.classList.add('active');
        
        // Keep hamburger icon - don't change to X
    }
    
    function closeSidebar() {
        dashNav.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.classList.remove('active');
        
        // Keep hamburger icon
    }
    
    // Event listeners
    menuToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);
    
    // Close sidebar when clicking on navigation links (except profile link)
    const navLinks = dashNav.querySelectorAll('a:not(.profile-link)');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Small delay to allow navigation to occur
            setTimeout(closeSidebar, 100);
        });
    });
    
    // Close sidebar on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dashNav.classList.contains('active')) {
            closeSidebar();
        }
    });
}

// ============================================================================
// DARK MODE FUNCTIONALITY
// ============================================================================

function initializeDarkMode() {
    // Check saved theme preference or default to light
    const savedTheme = localStorage.getItem('fsh_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Create theme toggle in nav-right sections
    createThemeToggle();
}

function createThemeToggle() {
    // Get all nav-right containers (both desktop sidebar and mobile)
    const navRightContainers = document.querySelectorAll('.nav-right');
    
    navRightContainers.forEach(container => {
        // Create theme toggle container
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-toggle-container';
        
        // Create the toggle switch
        const themeToggle = document.createElement('div');
        themeToggle.className = 'theme-toggle';
        themeToggle.setAttribute('aria-label', 'Toggle Dark Mode');
        
        const savedTheme = localStorage.getItem('fsh_theme') || 'light';
        
        // Just the slider with icon inside - no side icons
        themeToggle.innerHTML = `
            <div class="theme-toggle-slider">
                <i class="fas ${savedTheme === 'dark' ? 'fa-moon' : 'fa-sun'}"></i>
            </div>
        `;
        
        // Create label
        const themeLabel = document.createElement('span');
        themeLabel.className = 'theme-label';
        themeLabel.textContent = 'Theme';
        
        // Append elements
        themeContainer.appendChild(themeToggle);
        themeContainer.appendChild(themeLabel);
        
        // Insert AFTER profile section (not before)
        const profileSection = container.querySelector('.profile-section');
        if (profileSection) {
            profileSection.parentNode.insertBefore(themeContainer, profileSection.nextSibling);
        } else {
            container.appendChild(themeContainer);
        }
        
        // Add click handler
        themeToggle.addEventListener('click', toggleTheme);
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('fsh_theme', newTheme);
    
    // Update all toggle sliders
    const sliders = document.querySelectorAll('.theme-toggle-slider i');
    sliders.forEach(icon => {
        icon.className = `fas ${newTheme === 'dark' ? 'fa-moon' : 'fa-sun'}`;
    });
}

// Make function globally available
window.toggleTheme = toggleTheme;

// ============================================================================
// MAIL BUTTON FUNCTIONALITY
// ============================================================================

function initializeMailButton() {
    // Only show mail button on dashboard page
    if (!window.location.pathname.includes('dashboard.html')) {
        return;
    }
    
    // Create mail button
    const mailButton = document.createElement('a');
    mailButton.href = 'mail.html';
    mailButton.className = 'mail-button';
    mailButton.setAttribute('aria-label', 'Notifications');
    mailButton.setAttribute('title', 'Notifications');
    
    mailButton.innerHTML = `
        <img src="../public/Mail.png" alt="Mail">
        <span class="notification-badge" id="notification-badge">0</span>
    `;
    
    // Insert button into DOM
    document.body.insertBefore(mailButton, document.body.firstChild);
}

// Make functions globally available
window.toggleSidebar = function() {
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.click();
    }
};