// ===========================
// API URL
// ===========================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://afyaconnect-mlly.onrender.com';

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
// FIX: null-safe, locks background scroll, Escape key
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

        // FIX: auto-close sidebar after nav tap on mobile
        if (window.innerWidth <= 480) closeSidebar();
    });
});

// ===========================
// NOTIFICATION BADGE SYNC
// FIX: keeps both desktop and mobile badges in sync
// ===========================
function setNotifBadge(count) {
    const desktop = document.getElementById('notifBadge');
    const mobile  = document.getElementById('notifBadgeMobile');

    [desktop, mobile].forEach(badge => {
        if (!badge) return;
        if (count > 0) {
            badge.textContent   = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
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

        // Show paid consultations with Start Session button
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

        // Update stats + badge
        const statPending = document.getElementById('statPending');
        if (statPending) statPending.textContent = pending.length;
        setNotifBadge(pending.length);

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
            <div class="request-item" id="all-req-${req.id}">
                <div class="patient-info">
                    <div class="patient-avatar">${getInitials(req.patient_name || 'Patient')}</div>
                    <div>
                        <p class="p-name">${req.patient_name || `Patient #${req.patient_id}`}</p>
                        <p class="p-status">${new Date(req.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
                    </div>
                </div>
                <span class="badge ${req.status}">${req.status.replace('_', ' ')}</span>
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
// DECLINE REQUEST
// ===========================
function declineRequest(consultationId) {
    const reqEl = document.getElementById(`req-${consultationId}`);
    if (reqEl) {
        reqEl.style.opacity       = '0.4';
        reqEl.style.pointerEvents = 'none';
        setTimeout(() => reqEl.remove(), 400);
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
// SOCKET.IO NOTIFICATIONS
// ===========================
if (typeof io !== 'undefined') {
    const notifSocket = io(API_URL, { transports: ['websocket'] });

    notifSocket.on('connect', () => {
        console.log('🔔 Doctor socket connected:', notifSocket.id);
        notifSocket.emit('join_user_room', user.id);
    });

    notifSocket.on('patient_paid', (data) => {
        console.log('💳 patient_paid received:', data);
        showNotification(
            '💳 Payment Received!',
            'Patient has paid. Start the session now!',
            () => startSession(data.consultation_id)
        );
        loadRequests();
        loadActiveSession();
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
    window.location.href = 'index.html';
});

// ===========================
// INIT
// ===========================
loadRequests();
loadActiveSession();
setInterval(loadRequests,      10000);
setInterval(loadActiveSession, 15000);