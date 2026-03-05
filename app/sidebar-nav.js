// ============================================================================
// SIDEBAR-NAV.JS - Pull Tab Sidebar Navigation + Dark Mode Toggle
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    initializeDarkMode();
    initializeMailButton();
    
    // Detect current page by DOM elements instead of pathname,
    // so it works on Cloudflare Pages where .html is stripped from URLs.
    if (document.querySelector('.lab-header')) {
        document.body.setAttribute('data-page', 'laboratory');
    } else if (document.querySelector('.mail-container')) {
        document.body.setAttribute('data-page', 'mail');
    } else if (document.querySelector('.profile-container')) {
        document.body.setAttribute('data-page', 'profile');
    } else if (document.querySelector('.lab-grid')) {
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
    // One-time migration: clear any auto-saved theme that was never manually
    // chosen, so the device theme takes over for existing users too.
    const savedTheme = localStorage.getItem('fsh_theme');
    const userManuallyToggled = localStorage.getItem('fsh_theme_manual');
    if (savedTheme && !userManuallyToggled) {
        localStorage.removeItem('fsh_theme');
    }

    // If the user has never manually set a theme, follow the device
    if (!localStorage.getItem('fsh_theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        // User has a saved preference — respect it
        document.documentElement.setAttribute('data-theme', localStorage.getItem('fsh_theme'));
    }
    
    // Listen for device theme changes while the app is open
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if the user hasn't manually set a preference
        if (!localStorage.getItem('fsh_theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            // Update the toggle slider icon too
            const sliders = document.querySelectorAll('.theme-toggle-slider i');
            sliders.forEach(icon => {
                icon.className = `fas ${e.matches ? 'fa-moon' : 'fa-sun'}`;
            });
        }
    });
    
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
        
        // Read current active theme from the DOM (already set by initializeDarkMode)
        const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
        
        // Just the slider with icon inside - no side icons
        themeToggle.innerHTML = `
            <div class="theme-toggle-slider">
                <i class="fas ${activeTheme === 'dark' ? 'fa-moon' : 'fa-sun'}"></i>
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
    localStorage.setItem('fsh_theme_manual', '1'); // Mark as manually chosen
    
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
    // Use a DOM check instead of pathname so this works on Cloudflare Pages
    // where URLs don't have .html (e.g. /dashboard instead of /dashboard.html).
    // .lab-grid is unique to dashboard.html so it's a reliable signal.
    const isDashboard = !!document.querySelector('.lab-grid');
    if (!isDashboard) {
        return;
    }
    
    // Create mail button
    const mailButton = document.createElement('a');
    mailButton.href = 'mail.html';
    mailButton.className = 'mail-button';
    mailButton.setAttribute('aria-label', 'Notifications');
    mailButton.setAttribute('title', 'Notifications');
    
    mailButton.innerHTML = `
        <svg class="nav-icon mail-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" fill="none">
            <rect x="12" y="28" width="76" height="50" rx="6" stroke="currentColor" stroke-width="6"/>
            <polyline points="12,28 50,58 88,28" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
        </svg>
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