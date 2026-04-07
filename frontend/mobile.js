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
    // HAMBURGER TOGGLE
    // ===========================
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar   = document.querySelector('.sidebar');

    // Make closeSidebar available globally (for other scripts)
    window.closeSidebar = function() {
        if (hamburger) hamburger.classList.remove('open');
        if (sidebar)   sidebar.classList.remove('open');
        if (overlay)   overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        });

        // Close sidebar when overlay clicked
        overlay.addEventListener('click', window.closeSidebar);

        // Close sidebar when nav link clicked
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) window.closeSidebar();
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.closeSidebar();
        });
    }

    // ===========================
    // INJECT MOBILE BOTTOM NAV
    // (for dashboard and doctor pages)
    // ===========================
    const isDashboard    = window.location.pathname.includes('dashboard');
    const isDoctorPage   = window.location.pathname.includes('doctor');
    const isAdminPage    = window.location.pathname.includes('admin');
    const isConsultation = window.location.pathname.includes('consultation');

    if (isDashboard) {
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'mobile-bottom-nav';
        bottomNav.innerHTML = `
            <a href="#" onclick="switchToSection('dashboard')" class="active" id="bnDashboard">
                <i class="fas fa-th-large"></i>
                <span>Home</span>
            </a>
            <a href="#" onclick="switchToSection('requests')" id="bnRequests">
                <i class="fas fa-history"></i>
                <span>Requests</span>
            </a>
            <a href="#" onclick="switchToSection('consultations')" id="bnConsult">
                <i class="fas fa-comment-medical"></i>
                <span>Sessions</span>
            </a>
            <a href="#" onclick="switchToSection('prescriptions')" id="bnRx">
                <i class="fas fa-file-medical"></i>
                <span>Rx</span>
            </a>
            <a href="#" onclick="switchToSection('profile')" id="bnProfile">
                <i class="fas fa-user-circle"></i>
                <span>Profile</span>
            </a>
        `;
        document.body.appendChild(bottomNav);
    }

    if (isDoctorPage) {
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'mobile-bottom-nav';
        bottomNav.innerHTML = `
            <a href="#" onclick="switchDoctorSection('dashboard')" class="active">
                <i class="fas fa-th-large"></i>
                <span>Dashboard</span>
            </a>
            <a href="#" onclick="switchDoctorSection('requests')">
                <i class="fas fa-user-injured"></i>
                <span>Requests</span>
            </a>
            <a href="#" onclick="switchDoctorSection('profile')">
                <i class="fas fa-user-circle"></i>
                <span>Profile</span>
            </a>
            <a href="index.html">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </a>
        `;
        document.body.appendChild(bottomNav);
    }

    if (isAdminPage) {
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'mobile-bottom-nav';
        bottomNav.innerHTML = `
            <a href="#" onclick="switchSection('overview')" class="active">
                <i class="fas fa-chart-pie"></i>
                <span>Overview</span>
            </a>
            <a href="#" onclick="switchSection('users')">
                <i class="fas fa-users"></i>
                <span>Users</span>
            </a>
            <a href="#" onclick="switchSection('consultations')">
                <i class="fas fa-stethoscope"></i>
                <span>Consults</span>
            </a>
            <a href="#" onclick="switchSection('payments')">
                <i class="fas fa-money-bill-wave"></i>
                <span>Payments</span>
            </a>
        `;
        document.body.appendChild(bottomNav);
    }

    // ===========================
    // HELPER: Switch sections with
    // bottom nav active state
    // ===========================
    window.switchToSection = (section) => {
        // Update active state on bottom nav
        document.querySelectorAll('.mobile-bottom-nav a').forEach(a => a.classList.remove('active'));
        const map = {
            dashboard: 'bnDashboard',
            requests: 'bnRequests',
            consultations: 'bnConsult',
            prescriptions: 'bnRx',
            profile: 'bnProfile'
        };
        const activeEl = document.getElementById(map[section]);
        if (activeEl) activeEl.classList.add('active');

        // Trigger the existing section switch
        const link = document.querySelector(`.nav-link[data-section="${section}"]`);
        if (link) link.click();
    };

    window.switchDoctorSection = (section) => {
        document.querySelectorAll('.mobile-bottom-nav a').forEach(a => a.classList.remove('active'));
        // Find the clicked link and add active class
        const clickedLink = Array.from(document.querySelectorAll('.mobile-bottom-nav a')).find(
            a => a.textContent.toLowerCase().includes(section) || 
                 a.getAttribute('onclick')?.includes(section)
        );
        if (clickedLink) clickedLink.classList.add('active');
        
        const link = document.querySelector(`.nav-link[data-section="${section}"]`);
        if (link) link.click();
    };

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
    // (fix for address bar on iOS/Android)
    // ===========================
    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setVH();
    window.addEventListener('resize', setVH);

});