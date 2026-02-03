// ============================================================================
// SIDEBAR-NAV.JS - Pull Tab Sidebar Navigation
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
});

function initializeSidebar() {
    // Create pull tab button
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.setAttribute('aria-label', 'Toggle Menu');
    
    // Add icon and text to pull tab
    menuToggle.innerHTML = `
        <i class="fas fa-chevron-right"></i>
        <span class="tab-text">MENU</span>
    `;
    
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
        
        // Update icon for desktop (chevron rotates)
        const icon = menuToggle.querySelector('i');
        if (window.innerWidth > 768) {
            // Icon rotation is handled by CSS
        } else {
            // Mobile: change to X icon
            icon.className = 'fas fa-times';
        }
    }
    
    function closeSidebar() {
        dashNav.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle.classList.remove('active');
        
        // Update icon
        const icon = menuToggle.querySelector('i');
        if (window.innerWidth > 768) {
            icon.className = 'fas fa-chevron-right';
        } else {
            icon.className = 'fas fa-bars';
        }
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
    
    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const icon = menuToggle.querySelector('i');
            if (window.innerWidth > 768) {
                if (dashNav.classList.contains('active')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-right';
                }
            } else {
                if (dashNav.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        }, 250);
    });
    
    // Set initial icon based on screen size
    const icon = menuToggle.querySelector('i');
    if (window.innerWidth <= 768) {
        icon.className = 'fas fa-bars';
    }
}

// Make functions globally available
window.toggleSidebar = function() {
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.click();
    }
};