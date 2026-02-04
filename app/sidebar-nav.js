// ============================================================================
// SIDEBAR-NAV.JS - Pull Tab Sidebar Navigation + Dark Mode Toggle
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    initializeDarkMode();
});

function initializeSidebar() {
    // Create hamburger button (now in upper right)
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.setAttribute('aria-label', 'Toggle Menu');
    
    // Add hamburger icon
    menuToggle.innerHTML = `<i class="fas fa-bars"></i>`;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    
    // Insert elements into DOM
    document.body.insertBefore(menuToggle, document.body.firstChild);
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
        
        // Change to X icon
        const icon = menuToggle.querySelector('i');
        icon.className = 'fas fa-times';
    }
    
    function closeSidebar() {
        dashNav.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.classList.remove('active');
        
        // Change back to hamburger icon
        const icon = menuToggle.querySelector('i');
        icon.className = 'fas fa-bars';
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
    // Create dark mode toggle button (in upper left)
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Toggle Dark Mode');
    
    // Check saved theme preference or default to light
    const savedTheme = localStorage.getItem('fsh_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Set initial icon
    updateThemeIcon(themeToggle, savedTheme);
    
    // Insert button into DOM
    document.body.insertBefore(themeToggle, document.body.firstChild);
    
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
    if (theme === 'dark') {
        button.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        button.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Make functions globally available
window.toggleSidebar = function() {
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.click();
    }
};