// ============================================================================
// SIDEBAR-NAV.JS - Pull Tab Sidebar Navigation + Dark Mode Toggle
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    initializeDarkMode();
});

function initializeSidebar() {
    // 1. SELECT existing elements instead of creating them
    const menuToggle = document.getElementById('menu-toggle');
    const dashNav = document.querySelector('.dash-nav');
    
    // Create overlay dynamically (or check if it exists)
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }
    
    // Safety check: ensure button exists before adding listeners
    if (!menuToggle) return;

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
        
        // Change to X icon
        const icon = menuToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-times';
    }
    
    function closeSidebar() {
        dashNav.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.classList.remove('active');
        
        // Change back to hamburger icon
        const icon = menuToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
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
    // 1. SELECT existing button instead of creating it
    const themeToggle = document.getElementById('theme-toggle');
    
    // Safety check
    if (!themeToggle) return;
    
    // Check saved theme preference or default to light
    const savedTheme = localStorage.getItem('fsh_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Set initial icon
    updateThemeIcon(themeToggle, savedTheme);
    
    // Toggle theme function
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('fsh_theme', newTheme);
        updateThemeIcon(themeToggle, newTheme);
        
        // Add animation
        themeToggle.style.transform = 'rotate(360deg) scale(1.1)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 300);
    });
}

function updateThemeIcon(button, theme) {
    // Ensure button has an icon element
    let icon = button.querySelector('i');
    if (!icon) {
        icon = document.createElement('i');
        button.appendChild(icon);
    }

    if (theme === 'dark') {
        icon.className = 'fas fa-moon';
    } else {
        icon.className = 'fas fa-sun';
    }
}

// Make functions globally available
window.toggleSidebar = function() {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.click();
    }
};