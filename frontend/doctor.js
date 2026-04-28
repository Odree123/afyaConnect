// ===========================
// API URL
// ===========================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://afyaconnect-backend.onrender.com';

// ===========================
// AUTH GUARD
// ===========================
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) {
    window.location.href = 'index.html';
}

// ===========================
// HELPERS
// ===========================
function getInitials(name) {
    return (name || 'DR').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// ===========================
// NOTIFICATION COUNTERS (EXPIRED SPECIFIC)
// ===========================
let notificationCounts = {
    request: 0,
    paid: 0,
    expired: 0,
    general: 0
};

// ===========================
// NOTIFICATION PANEL VARIABLES
// ===========================
let notifications = [];
let unreadNotifications = [];

// ===========================
// SET DOCTOR INFO
// ===========================
const initials = getInitials(user?.name);

const doctorWelcomeEl    = document.getElementById('doctorWelcome');
const doctorAvatarEl     = document.getElementById('doctorAvatar');
const doctorAvatarMobEl  = document.getElementById('doctorAvatarMobile');

if (doctorWelcomeEl)   doctorWelcomeEl.textContent   = user?.name || 'Dr. —';
if (doctorAvatarEl)    doctorAvatarEl.textContent     = initials;
if (doctorAvatarMobEl) doctorAvatarMobEl.textContent  = initials;

if (user) {
    const nameInput  = document.getElementById('profileNameInput');
    const emailInput = document.getElementById('profileEmail');
    const avatarEl   = document.getElementById('profileAvatar');
    const nameEl     = document.getElementById('profileName');

    if (nameInput)  nameInput.value      = user.name  || '';
    if (emailInput) emailInput.value     = user.email || '';
    if (avatarEl)   avatarEl.textContent = initials;
    if (nameEl)     nameEl.textContent   = user.name  || '';
}

// ===========================
// SIDEBAR — HAMBURGER TOGGLE
// ===========================
const hamburger = document.querySelector('.hamburger');
const sidebar   = document.querySelector('.sidebar');
const overlay   = document.querySelector('.sidebar-overlay');

function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
}

hamburger?.addEventListener('click', openSidebar);
overlay?.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
});

// ===========================
// SIDEBAR NAVIGATION
// ===========================
document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        ['dashboard', 'requests', 'profile'].forEach(s => {
            const el = document.getElementById(`section-${s}`);
            if (el) el.style.display = 'none';
        });

        const target = document.getElementById(`section-${section}`);
        if (target) {
            target.style.display = 'block';
            if (section === 'dashboard') loadRequests();
            if (section === 'requests')  loadAllRequests();
        }

        if (window.innerWidth <= 480) closeSidebar();
    });
});

// ===========================
// ENHANCED NOTIFICATION BADGE WITH EXPIRED COUNTER
// ===========================
function updateNotifBadge(type = 'general') {
    const desktop = document.getElementById('notifBadge');
    const mobile  = document.getElementById('notifBadgeMobile');

    if (notificationCounts.hasOwnProperty(type)) {
        notificationCounts[type]++;
    } else {
        notificationCounts.general++;
    }
    
    const total = Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
    
    [desktop, mobile].forEach(badge => {
        if (!badge) return;
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = 'flex';
            
            if (notificationCounts.expired > 0) {
                badge.style.backgroundColor = '#dc2626';
                badge.style.animation = 'pulse 1s infinite';
            } else if (notificationCounts.paid > 0) {
                badge.style.backgroundColor = '#10b981';
                badge.style.animation = 'none';
            } else if (notificationCounts.request > 0) {
                badge.style.backgroundColor = '#3b82f6';
                badge.style.animation = 'none';
            } else {
                badge.style.backgroundColor = '#ef4444';
                badge.style.animation = 'none';
            }
        } else {
            badge.style.display = 'none';
            badge.style.animation = 'none';
        }
    });
    
    saveNotificationCounts();
}

function resetNotificationCount(type) {
    if (notificationCounts.hasOwnProperty(type)) {
        notificationCounts[type] = 0;
    }
    
    const total = Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
    const desktop = document.getElementById('notifBadge');
    const mobile = document.getElementById('notifBadgeMobile');
    
    [desktop, mobile].forEach(badge => {
        if (!badge) return;
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = 'flex';
            
            if (notificationCounts.expired > 0) {
                badge.style.backgroundColor = '#dc2626';
                badge.style.animation = 'pulse 1s infinite';
            } else if (notificationCounts.paid > 0) {
                badge.style.backgroundColor = '#10b981';
            } else if (notificationCounts.request > 0) {
                badge.style.backgroundColor = '#3b82f6';
            }
        } else {
            badge.style.display = 'none';
            badge.style.animation = 'none';
        }
    });
    
    saveNotificationCounts();
}

function saveNotificationCounts() {
    localStorage.setItem('doctor_notif_counts', JSON.stringify({
        counts: notificationCounts,
        timestamp: new Date().toISOString()
    }));
}

function loadNotificationCounts() {
    const saved = localStorage.getItem('doctor_notif_counts');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            notificationCounts = data.counts || notificationCounts;
            const total = Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
            
            if (total > 0) {
                const desktop = document.getElementById('notifBadge');
                const mobile = document.getElementById('notifBadgeMobile');
                
                [desktop, mobile].forEach(badge => {
                    if (badge) {
                        badge.textContent = total;
                        badge.style.display = 'flex';
                        if (notificationCounts.expired > 0) {
                            badge.style.backgroundColor = '#dc2626';
                            badge.style.animation = 'pulse 1s infinite';
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load notification counts:', e);
        }
    }
}

// ===========================
// NOTIFICATION PANEL FUNCTIONS
// ===========================
function loadNotifications() {
    const saved = localStorage.getItem('doctor_notifications');
    if (saved) {
        try {
            notifications = JSON.parse(saved);
            unreadNotifications = notifications.filter(n => !n.read);
            updateNotificationBadge();
            renderNotificationList();
        } catch (e) {
            console.error('Failed to load notifications:', e);
        }
    }
}

function saveNotifications() {
    localStorage.setItem('doctor_notifications', JSON.stringify(notifications));
}

function addNotification(title, message, type, onClick = null) {
    const notification = {
        id: Date.now(),
        title: title,
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        read: false,
        onClick: onClick
    };
    
    notifications.unshift(notification);
    unreadNotifications = notifications.filter(n => !n.read);
    
    saveNotifications();
    updateNotificationBadge();
    renderNotificationList();
    
    showNotification(title, message, onClick);
    
    if (type === 'expired' || type === 'paid') {
        playNotificationSound();
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    const badgeMobile = document.getElementById('notifBadgeMobile');
    
    const count = unreadNotifications.length;
    
    [badge, badgeMobile].forEach(b => {
        if (b) {
            if (count > 0) {
                b.textContent = count;
                b.style.display = 'flex';
                
                const hasExpired = notifications.some(n => !n.read && n.type === 'expired');
                if (hasExpired) {
                    b.style.backgroundColor = '#dc2626';
                    b.style.animation = 'pulse 1s infinite';
                } else {
                    b.style.backgroundColor = '#ef4444';
                    b.style.animation = 'none';
                }
            } else {
                b.style.display = 'none';
            }
        }
    });
}

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
    }
}

document.addEventListener('click', function(event) {
    const panel = document.getElementById('notificationPanel');
    const bell = document.getElementById('notificationBell');
    const bellMobile = document.getElementById('notificationBellMobile');
    
    if (panel && bell) {
        if (!panel.contains(event.target) && !bell.contains(event.target) && (!bellMobile || !bellMobile.contains(event.target))) {
            panel.style.display = 'none';
        }
    }
});

function renderNotificationList() {
    const listContainer = document.getElementById('notificationList');
    if (!listContainer) return;
    
    if (notifications.length === 0) {
        listContainer.innerHTML = '<div class="notification-empty">No notifications yet</div>';
        return;
    }
    
    listContainer.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="handleNotificationClick(${notif.id})">
            <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
            <div class="notification-content">
                <div class="notification-title">${notif.title}</div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-time">${formatTimeAgo(notif.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    switch(type) {
        case 'paid': return '💰';
        case 'expired': return '⏰';
        case 'accepted': return '✅';
        case 'request': return '🆕';
        default: return '🔔';
    }
}

function formatTimeAgo(timestamp) {
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

function handleNotificationClick(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        unreadNotifications = notifications.filter(n => !n.read);
        saveNotifications();
        updateNotificationBadge();
        renderNotificationList();
        
        if (notification.onClick) {
            notification.onClick();
        } else {
            switch(notification.type) {
                case 'paid':
                    document.querySelector('.nav-link[data-section="dashboard"]')?.click();
                    break;
                case 'request':
                    document.querySelector('.nav-link[data-section="requests"]')?.click();
                    break;
                case 'expired':
                    document.querySelector('.nav-link[data-section="dashboard"]')?.click();
                    break;
            }
        }
    }
}

function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    unreadNotifications = [];
    saveNotifications();
    updateNotificationBadge();
    renderNotificationList();
}

// ===========================
// LOAD REQUESTS (Dashboard tab)
// ===========================
async function loadRequests() {
    const list      = document.getElementById('requestsList');
    const loadingEl = document.getElementById('loadingRequests');

    if (!list) return;

    list.innerHTML = '';
    if (loadingEl) loadingEl.style.display = 'flex';

    try {
        const res  = await fetch(`${API_URL}/api/consultations/doctor/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (loadingEl) loadingEl.style.display = 'none';

        const pending = Array.isArray(data) ? data.filter(c => c.status === 'requested') : [];
        const paid    = Array.isArray(data) ? data.filter(c => c.status === 'paid')      : [];

        const wrapper = document.getElementById('currentSessionWrapper');
        const card    = document.getElementById('currentSession');

        if (paid.length > 0 && wrapper && card) {
            wrapper.style.display = 'block';
            card.innerHTML = paid.map(c => `
                <div class="session-info">
                    <h4>Consulting with <strong>${c.patient_name || `Patient #${c.patient_id}`}</strong></h4>
                    <p class="session-status">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#3b82f6; margin-right:6px;"></span>
                        Payment confirmed — Ready to start
                    </p>
                </div>
                <div class="session-actions">
                    <button class="btn-prescribe" onclick="startSession(${c.id})">
                        <i class="fas fa-play-circle"></i> Start Session
                    </button>
                </div>
            `).join('');
        }

        const statPending = document.getElementById('statPending');
        if (statPending) statPending.textContent = pending.length;
        
        if (pending.length > 0) {
            updateNotifBadge('request');
        }

        if (pending.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🩺</div>
                    <h4>No incoming requests</h4>
                    <p>New consultation requests will appear here.</p>
                </div>`;
            return;
        }

        list.innerHTML = pending.map(req => `
            <div class="request-item" id="req-${req.id}">
                <div class="patient-info">
                    <div class="patient-avatar">${getInitials(req.patient_name || 'Patient')}</div>
                    <div>
                        <p class="p-name">${req.patient_name || `Patient #${req.patient_id}`}</p>
                        <p class="p-status">Requested · ${timeAgo(req.created_at)}</p>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn-accept" onclick="acceptRequest(${req.id})">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="btn-decline" onclick="declineRequest(${req.id})">Decline</button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (list) list.innerHTML = `<div class="empty-state"><p>Could not load requests.</p></div>`;
        console.error('Error loading requests:', err);
    }
}

// ===========================
// LOAD ALL REQUESTS (Patient Requests tab)
// ===========================
async function loadAllRequests() {
    const list = document.getElementById('allRequestsList');
    if (!list) return;

    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/consultations/doctor/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok || !Array.isArray(data) || data.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h4>No consultations yet</h4>
                    <p>Your consultation history will appear here.</p>
                </div>`;
            return;
        }

        list.innerHTML = data.map(req => `
            <div class="request-item ${req.status === 'expired' ? 'expired-item' : ''}" id="all-req-${req.id}">
                <div class="patient-info">
                    <div class="patient-avatar">${getInitials(req.patient_name || 'Patient')}</div>
                    <div>
                        <p class="p-name">${req.patient_name || `Patient #${req.patient_id}`}</p>
                        <p class="p-status">${new Date(req.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
                    </div>
                </div>
                <span class="badge ${req.status}">${req.status === 'expired' ? 'EXPIRED' : req.status.replace('_', ' ')}</span>
            </div>
        `).join('');

    } catch (err) {
        list.innerHTML = `<div class="empty-state"><p>Could not load consultations.</p></div>`;
    }
}

// ===========================
// LOAD ACTIVE SESSION
// ===========================
async function loadActiveSession() {
    try {
        const res  = await fetch(`${API_URL}/api/consultations/doctor/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (!Array.isArray(data)) return;

        const active = data.find(c =>
            c.status === 'paid' ||
            c.status === 'accepted' ||
            c.status === 'in_progress'
        );

        if (active) {
            loadCurrentSession(active);
        } else {
            const wrapper = document.getElementById('currentSessionWrapper');
            if (wrapper) wrapper.style.display = 'none';
        }
    } catch (err) {
        console.error('Error loading active session:', err);
    }
}

// ===========================
// ACCEPT REQUEST
// ===========================
async function acceptRequest(consultationId) {
    const acceptBtn = document.querySelector(`#req-${consultationId} .btn-accept`);
    if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.innerHTML = 'Accepting...'; }

    try {
        const res  = await fetch(`${API_URL}/api/consultations/accept/${consultationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data || 'Could not accept consultation.');
            if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.innerHTML = '<i class="fas fa-check"></i> Accept'; }
            return;
        }

        resetNotificationCount('request');
        
        loadRequests();
        loadAllRequests();
        loadCurrentSession(data);

    } catch (err) {
        console.error('Error accepting:', err);
        alert('Server error. Please try again.');
        if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.innerHTML = '<i class="fas fa-check"></i> Accept'; }
    }
}

// ===========================
// START SESSION
// ===========================
async function startSession(consultationId) {
    try {
        const res  = await fetch(`${API_URL}/api/consultations/start/${consultationId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
            if (typeof io !== 'undefined') {
                const sock = io(API_URL);
                sock.on('connect', () => {
                    sock.emit('consultation_started', {
                        consultation_id: consultationId,
                        patient_id: data.patient_id
                    });
                });
            }
            window.location.href = `consult.html?id=${consultationId}`;
        } else {
            alert('Could not start session. Please try again.');
        }
    } catch (err) {
        console.error('Error starting session:', err);
    }
}

// ===========================
// DECLINE REQUEST (with database update)
// ===========================
async function declineRequest(consultationId) {
    const reqEl = document.getElementById(`req-${consultationId}`);
    const declineBtn = reqEl?.querySelector('.btn-decline');
    
    if (declineBtn) {
        declineBtn.disabled = true;
        declineBtn.innerHTML = 'Declining...';
    }
    
    try {
        const res = await fetch(`${API_URL}/api/consultations/decline/${consultationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            alert(data.message || data || 'Could not decline consultation.');
            if (declineBtn) {
                declineBtn.disabled = false;
                declineBtn.innerHTML = 'Decline';
            }
            return;
        }
        
        addNotification(
            '❌ Consultation Declined',
            'You have declined this consultation request.',
            'general',
            null
        );
        
        if (reqEl) {
            reqEl.style.transition = 'all 0.3s ease';
            reqEl.style.opacity = '0';
            reqEl.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                reqEl.remove();
                
                const requestsList = document.getElementById('requestsList');
                if (requestsList && requestsList.children.length === 0) {
                    requestsList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">🩺</div>
                            <h4>No incoming requests</h4>
                            <p>New consultation requests will appear here.</p>
                        </div>`;
                }
                
                const statPending = document.getElementById('statPending');
                if (statPending) {
                    const currentCount = parseInt(statPending.textContent) || 0;
                    statPending.textContent = Math.max(0, currentCount - 1);
                }
            }, 300);
        }
        
        resetNotificationCount('request');
        loadAllRequests();
        
    } catch (err) {
        console.error('Error declining request:', err);
        alert('Cannot connect to server. Please try again.');
        if (declineBtn) {
            declineBtn.disabled = false;
            declineBtn.innerHTML = 'Decline';
        }
    }
}

// ===========================
// CURRENT SESSION
// ===========================
let activeConsultationId = null;

function loadCurrentSession(consultation) {
    const wrapper = document.getElementById('currentSessionWrapper');
    const card    = document.getElementById('currentSession');

    if (!wrapper || !card || !consultation) {
        if (wrapper) wrapper.style.display = 'none';
        return;
    }

    activeConsultationId  = consultation.id;
    wrapper.style.display = 'block';

    card.innerHTML = `
        <div class="session-info">
            <h4>Consulting with <strong>${consultation.patient_name || `Patient #${consultation.patient_id}`}</strong></h4>
            <p class="session-status">
                <span class="dot red-dot"></span> Status: ${consultation.status.replace('_', ' ')}
            </p>
        </div>
        <div class="session-actions">
            ${consultation.status === 'paid' ? `
                <button class="btn-prescribe" onclick="startSession(${consultation.id})">
                    <i class="fas fa-play-circle"></i> Start Session
                </button>
            ` : consultation.status === 'in_progress' ? `
                <button class="btn-prescribe" onclick="openPrescriptionModal(${consultation.id})">
                    <i class="fas fa-file-medical"></i> Write Prescription
                </button>
                <button class="btn-end" onclick="endSession(${consultation.id})">
                    <i class="fas fa-stop-circle"></i> End Session
                </button>
            ` : `
                <span style="color:#856404; font-size:0.85rem;">⏳ Waiting for patient to pay</span>
            `}
        </div>
    `;
}

// ===========================
// END SESSION
// ===========================
async function endSession(consultationId) {
    if (!confirm('Are you sure you want to end this session?')) return;

    try {
        const res = await fetch(`${API_URL}/api/consultations/complete/${consultationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            const wrapper = document.getElementById('currentSessionWrapper');
            if (wrapper) wrapper.style.display = 'none';
            activeConsultationId = null;

            const sessionsEl = document.getElementById('statSessions');
            if (sessionsEl) sessionsEl.textContent = parseInt(sessionsEl.textContent || 0) + 1;

            openPrescriptionModal(consultationId);
        } else {
            alert('Could not end session. Please try again.');
        }
    } catch (err) {
        console.error('Error ending session:', err);
    }
}

// ===========================
// PRESCRIPTION MODAL
// ===========================
let prescConsultationId = null;

function openPrescriptionModal(consultationId) {
    prescConsultationId = consultationId;

    const consultIdEl = document.getElementById('prescConsultId');
    const notes       = document.getElementById('prescNotes');
    const errEl       = document.getElementById('prescError');
    const sucEl       = document.getElementById('prescSuccess');

    if (consultIdEl) consultIdEl.textContent = `#${consultationId}`;
    if (notes)       notes.value             = '';
    if (errEl)       errEl.style.display     = 'none';
    if (sucEl)       sucEl.style.display     = 'none';

    document.getElementById('prescriptionModal')?.classList.add('active');
}

document.getElementById('closePrescription')?.addEventListener('click', () => {
    document.getElementById('prescriptionModal')?.classList.remove('active');
});

document.getElementById('prescriptionModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'prescriptionModal') {
        document.getElementById('prescriptionModal').classList.remove('active');
    }
});

document.getElementById('submitPrescription')?.addEventListener('click', async () => {
    const notes     = document.getElementById('prescNotes')?.value.trim();
    const btn       = document.getElementById('submitPrescription');
    const errorEl   = document.getElementById('prescError');
    const successEl = document.getElementById('prescSuccess');

    if (errorEl)   errorEl.style.display   = 'none';
    if (successEl) successEl.style.display = 'none';

    if (!notes) {
        if (errorEl) { errorEl.textContent = 'Please enter prescription notes.'; errorEl.style.display = 'block'; }
        return;
    }

    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const res = await fetch(`${API_URL}/api/prescriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ consultation_id: prescConsultationId, notes })
        });

        const data = await res.json();

        if (!res.ok) {
            if (errorEl) { errorEl.textContent = data || 'Could not submit prescription.'; errorEl.style.display = 'block'; }
        } else {
            if (successEl) { successEl.textContent = 'Prescription submitted successfully!'; successEl.style.display = 'block'; }

            const prescEl = document.getElementById('statPrescriptions');
            if (prescEl) prescEl.textContent = parseInt(prescEl.textContent || 0) + 1;

            setTimeout(() => {
                document.getElementById('prescriptionModal')?.classList.remove('active');
            }, 2000);
        }
    } catch (err) {
        if (errorEl) { errorEl.textContent = 'Server error. Please try again.'; errorEl.style.display = 'block'; }
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Prescription';
    }
});

// ===========================
// PLAY NOTIFICATION SOUND
// ===========================
function playNotificationSound() {
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Sound not supported'));
    } catch (e) {
        console.log('Audio not available');
    }
}

// ===========================
// SOCKET.IO NOTIFICATIONS
// ===========================
if (typeof io !== 'undefined') {
    const notifSocket = io(API_URL, { transports: ['websocket'] });

    notifSocket.on('connect', () => {
        console.log('🔔 Doctor socket connected:', notifSocket.id);
        notifSocket.emit('join_user_room', user.id);
        loadNotificationCounts();
        loadNotifications();
    });

    notifSocket.on('patient_paid', (data) => {
        console.log('💳 patient_paid received:', data);
        
        addNotification(
            '💰 Payment Received!',
            'Patient has paid. Start the session now!',
            'paid',
            () => startSession(data.consultation_id)
        );
        
        updateNotifBadge('paid');
        loadRequests();
        loadActiveSession();
        playNotificationSound();
    });

    notifSocket.on('consultation_expired', (data) => {
        console.log('⏰ Consultation expired for doctor:', data);
        
        addNotification(
            '⏰ Consultation Expired',
            data.message || `Patient did not complete payment. Slot is now free.`,
            'expired',
            () => {
                document.querySelector('.nav-link[data-section="dashboard"]')?.click();
            }
        );
        
        updateNotifBadge('expired');
        playNotificationSound();
        loadRequests();
        loadActiveSession();
        loadAllRequests();
    });

    notifSocket.on('new_consultation_request', (data) => {
        console.log('🆕 New consultation request:', data);
        
        addNotification(
            '🆕 New Consultation Request',
            `${data.patient_name || 'A patient'} wants to consult with you.`,
            'request',
            () => {
                document.querySelector('.nav-link[data-section="requests"]')?.click();
            }
        );
        
        updateNotifBadge('request');
        loadRequests();
        playNotificationSound();
    });

    notifSocket.on('connect_error', (err) => {
        console.error('❌ Socket error:', err.message);
    });
}

// ===========================
// NOTIFICATION TOAST
// ===========================
let notifCallback = null;
let notifTimeout  = null;

function showNotification(title, message, onClick) {
    let toast = document.getElementById('notifToast');
    if (!toast) {
        toast    = document.createElement('div');
        toast.id = 'notifToast';
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: white; border: 1.5px solid #d1fae5;
            border-left: 5px solid #059669; border-radius: 14px;
            padding: 16px 20px; max-width: 340px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            z-index: 9999; cursor: pointer; display: none;
        `;
        toast.innerHTML = `
            <div style="display:flex; align-items:flex-start; gap:12px;">
                <span style="font-size:1.5rem;">🔔</span>
                <div>
                    <p id="notifTitle"   style="font-weight:700; margin:0 0 4px; font-size:0.95rem;"></p>
                    <p id="notifMessage" style="margin:0; font-size:0.85rem; color:#6b7280;"></p>
                </div>
                <button onclick="closeNotif()" style="background:none; border:none; cursor:pointer; color:#9ca3af; font-size:1.1rem; margin-left:auto;">✕</button>
            </div>
        `;
        document.body.appendChild(toast);
    }

    const titleEl = document.getElementById('notifTitle');
    const msgEl   = document.getElementById('notifMessage');
    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = message;

    notifCallback       = onClick;
    toast.style.display = 'block';

    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => closeNotif(), 8000);

    toast.onclick = () => {
        if (notifCallback) notifCallback();
        closeNotif();
    };
}

function closeNotif() {
    const toast = document.getElementById('notifToast');
    if (toast) toast.style.display = 'none';
    clearTimeout(notifTimeout);
}

// ===========================
// STATUS TOGGLE
// ===========================
const statusToggle = document.getElementById('statusToggle');
const statusText   = document.getElementById('statusText');

statusToggle?.addEventListener('change', () => {
    if (!statusText) return;
    statusText.textContent = statusToggle.checked ? 'Online' : 'Offline';
    statusText.className   = statusToggle.checked ? 'status-text online-text' : 'status-text offline-text';
});

// ===========================
// PROFILE FORM
// ===========================
document.getElementById('profileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const successEl = document.getElementById('profileSuccess');
    if (successEl) {
        successEl.textContent   = 'Profile updated successfully!';
        successEl.style.display = 'block';
        setTimeout(() => { successEl.style.display = 'none'; }, 3000);
    }
});

// ===========================
// LOGOUT
// ===========================
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('doctor_notif_counts');
    localStorage.removeItem('doctor_notifications');
    window.location.href = 'index.html';
});

// ===========================
// INIT
// ===========================
loadNotificationCounts();
loadNotifications();
loadRequests();
loadActiveSession();
setInterval(loadRequests,      10000);
setInterval(loadActiveSession, 15000);