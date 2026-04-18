// ===========================
// AFYACONNECT MOBILE JS
// Add <script src="mobile.js"> 
// to all HTML pages
// ===========================

document.addEventListener('DOMContentLoaded', () => {

    // ===========================
    // INJECT MOBILE TOPBAR
    // ===========================
    const pageName = document.title.split('|')[0].trim() || 'afyaConnect';

    const mobileTopbar = document.createElement('div');
    mobileTopbar.className = 'mobile-topbar';
    mobileTopbar.innerHTML = `
        <button class="hamburger" id="hamburgerBtn" aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <div class="mobile-logo">afya<span style="color:#0f1923">Connect</span></div>
        <div style="width:40px"></div>
    `;
    document.body.prepend(mobileTopbar);

    // ===========================
    // INJECT SIDEBAR OVERLAY
    // ===========================
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);

    // ===========================
    // HAMBURGER TOGGLE (Fixed)
    // ===========================
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlayEl = document.querySelector('.sidebar-overlay');

    // Make closeSidebar available globally
    window.closeSidebar = function() {
        if (hamburger) hamburger.classList.remove('open');
        if (sidebar) sidebar.classList.remove('open');
        if (overlayEl) overlayEl.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    };

    if (hamburger && sidebar && overlayEl) {
        // Open/close on hamburger click
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburger.classList.toggle('open');
            sidebar.classList.toggle('open');
            overlayEl.classList.toggle('active');
            
            if (sidebar.classList.contains('open')) {
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
            } else {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
            }
        });

        // Close when overlay clicked
        overlayEl.addEventListener('click', (e) => {
            e.stopPropagation();
            window.closeSidebar();
        });

        // Close when clicking a nav link - FIXED for smooth scrolling
        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Check if it's a section link (starts with #)
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1); // Remove the #
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        // Close sidebar first
                        window.closeSidebar();
                        // Scroll to element after sidebar closes
                        setTimeout(() => {
                            targetElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }, 300);
                    }
                } else if (href && href !== '#') {
                    // External page link
                    window.closeSidebar();
                    setTimeout(() => {
                        window.location.href = href;
                    }, 150);
                } else {
                    // Just close sidebar (for buttons like login)
                    window.closeSidebar();
                }
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.closeSidebar();
        });
    }

    // ===========================
    // MOBILE BOTTOM NAV - REMOVED
    // ===========================
    // Bottom navigation (Home, Requests, Sessions, Rx, Profile) has been removed
    // as requested

    // ===========================
    // HELPER FUNCTIONS - REMOVED
    // (no longer needed without bottom nav)
    // ===========================
    // switchToSection and switchDoctorSection functions removed

    // ===========================
    // MAKE TABLES SWIPEABLE
    // ===========================
    document.querySelectorAll('.table-container').forEach(container => {
        let startX, scrollLeft;

        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('touchmove', (e) => {
            const x = e.touches[0].pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5;
            container.scrollLeft = scrollLeft - walk;
        });
    });

    // ===========================
    // FIX VIEWPORT HEIGHT on mobile
    // ===========================
    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setVH();
    window.addEventListener('resize', setVH);

});