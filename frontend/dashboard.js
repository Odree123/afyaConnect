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
    return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ===========================
// NOTIFICATION COUNTERS (EXPIRED SPECIFIC)
// ===========================
let notificationCounts = {
    accepted: 0,
    started: 0,
    expired: 0,
    declined: 0,
    general: 0
};

let totalUnreadCount = 0;
let notifCallback = null;
let notifTimeout = null;

// ===========================
// SET USER INFO IN TOP BAR
// ===========================
const userNameEl   = document.getElementById('userName');
const userAvatarEl = document.getElementById('userAvatar');
if (userNameEl)   userNameEl.textContent   = user?.name || 'User';
if (userAvatarEl) userAvatarEl.textContent = getInitials(user?.name || 'U');

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

        document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
        const target = document.getElementById(`section-${section}`);
        if (target) {
            target.style.display = 'block';
            if (section === 'dashboard')     loadDoctors();
            if (section === 'profile')       loadProfile();
            if (section === 'requests')      loadRequests();
            if (section === 'prescriptions') loadPrescriptions();
            if (section === 'consultations') loadConsultations();
        }

        if (window.innerWidth <= 480) closeSidebar();
    });
});

// ===========================
// ENHANCED NOTIFICATION SYSTEM WITH EXPIRED COUNTER
// ===========================
function updateNotifBadge(type = 'general') {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    
    if (notificationCounts.hasOwnProperty(type)) {
        notificationCounts[type]++;
    } else {
        notificationCounts.general++;
    }
    
    totalUnreadCount = Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
    
    badge.textContent = totalUnreadCount;
    badge.style.display = 'flex';
    
    if (notificationCounts.expired > 0) {
        badge.style.backgroundColor = '#dc2626';
        badge.style.animation = 'pulse 1s infinite';
    } else if (notificationCounts.declined > 0) {
        badge.style.backgroundColor = '#dc2626';
        badge.style.animation = 'none';
    } else if (notificationCounts.accepted > 0) {
        badge.style.backgroundColor = '#10b981';
        badge.style.animation = 'none';
    } else if (notificationCounts.started > 0) {
        badge.style.backgroundColor = '#3b82f6';
        badge.style.animation = 'none';
    } else {
        badge.style.backgroundColor = '#ef4444';
        badge.style.animation = 'none';
    }
    
    saveNotificationCounts();
}

function resetNotificationCount(type) {
    if (notificationCounts.hasOwnProperty(type)) {
        notificationCounts[type] = 0;
    }
    
    totalUnreadCount = Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
    
    const badge = document.getElementById('notifBadge');
    if (badge) {
        if (totalUnreadCount === 0) {
            badge.style.display = 'none';
        } else {
            badge.textContent = totalUnreadCount;
            if (notificationCounts.expired > 0) {
                badge.style.backgroundColor = '#dc2626';
            } else if (notificationCounts.declined > 0) {
                badge.style.backgroundColor = '#dc2626';
            } else if (notificationCounts.accepted > 0) {
                badge.style.backgroundColor = '#10b981';
            } else if (notificationCounts.started > 0) {
                badge.style.backgroundColor = '#3b82f6';
            }
        }
    }
    
    saveNotificationCounts();
}

function resetAllNotifications() {
    notificationCounts = {
        accepted: 0,
        started: 0,
        expired: 0,
        declined: 0,
        general: 0
    };
    totalUnreadCount = 0;
    
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.style.display = 'none';
        badge.style.animation = 'none';
    }
    
    localStorage.removeItem('notif_counts');
}

function saveNotificationCounts() {
    localStorage.setItem('notif_counts', JSON.stringify({
        counts: notificationCounts,
        total: totalUnreadCount,
        timestamp: new Date().toISOString()
    }));
}

function loadNotificationCounts() {
    const saved = localStorage.getItem('notif_counts');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            notificationCounts = data.counts || notificationCounts;
            totalUnreadCount = data.total || 0;
            
            if (totalUnreadCount > 0) {
                const badge = document.getElementById('notifBadge');
                if (badge) {
                    badge.textContent = totalUnreadCount;
                    badge.style.display = 'flex';
                    if (notificationCounts.expired > 0) {
                        badge.style.backgroundColor = '#dc2626';
                        badge.style.animation = 'pulse 1s infinite';
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load notification counts:', e);
        }
    }
}

// ===========================
// TOGGLE NOTIF PANEL
// ===========================
function toggleNotifPanel() {
    if (notificationCounts.expired > 0) {
        resetNotificationCount('expired');
    }
    if (notificationCounts.declined > 0) {
        resetNotificationCount('declined');
    }
    
    const badge = document.getElementById('notifBadge');
    if (badge && totalUnreadCount === 0) {
        badge.style.display = 'none';
    }
    
    const link = document.querySelector('.nav-link[data-section="requests"]');
    if (link) link.click();
}

// ===========================
// LOAD DOCTORS
// ===========================
async function loadDoctors() {
    const grid         = document.getElementById('doctorGrid');
    const loadingState = document.getElementById('loadingState');
    const errorState   = document.getElementById('errorState');
    const emptyState   = document.getElementById('emptyState');

    if (!grid) return;

    grid.innerHTML = '';
    if (loadingState) loadingState.style.display = 'flex';
    if (errorState)   errorState.style.display   = 'none';
    if (emptyState)   emptyState.style.display    = 'none';

    try {
        const res = await fetch(`${API_URL}/api/doctors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch doctors');

        const doctors  = await res.json();
        if (loadingState) loadingState.style.display = 'none';

        const available = Array.isArray(doctors) ? doctors : [];

        const onlineCount = document.getElementById('onlineCount');
        if (onlineCount) onlineCount.textContent = available.length;

        if (available.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        grid.innerHTML = available.map(doc => `
            <div class="doctor-card" id="card-${doc.id}">
                <div class="card-top">
                    <div class="doctor-avatar">${getInitials(doc.name)}</div>
                    <span class="status-tag online">Online</span>
                </div>
                <h3>${doc.name}</h3>
                <p class="specialty">${doc.specialization || 'General Practitioner'}</p>
                <div class="rating">
                    <i class="fas fa-star"></i> 5.0 (New)
                </div>
                <button class="btn-consult" onclick="sendRequest(${doc.id}, '${doc.name}')">
                    Consult Now
                </button>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading doctors:', err);
        if (loadingState) loadingState.style.display = 'none';
        if (errorState)   errorState.style.display   = 'block';
    }
}

// ===========================
// SEND CONSULTATION REQUEST
// ===========================
let currentConsultId = null;

async function sendRequest(doctorId, doctorName) {
    const btn = document.querySelector(`#card-${doctorId} .btn-consult`);
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    try {
        const res = await fetch(`${API_URL}/api/consultations/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ doctor_id: doctorId })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Could not send request.');
            if (btn) { btn.disabled = false; btn.textContent = 'Consult Now'; }
            return;
        }

        currentConsultId = data.id;
        const reqDoctorName = document.getElementById('requestDoctorName');
        if (reqDoctorName) reqDoctorName.textContent = doctorName;
        openModal('requestModal');

        if (btn) btn.textContent = 'Request Sent ✓';

    } catch (err) {
        console.error(err);
        alert('Cannot connect to server.');
        if (btn) { btn.disabled = false; btn.textContent = 'Consult Now'; }
    }
}

// ===========================
// RENEW EXPIRED CONSULTATION
// ===========================
async function renewConsultation(oldConsultId) {
    console.log('🔄 Renewing consultation:', oldConsultId);
    
    const renewBtn = document.querySelector(`#all-req-${oldConsultId} .btn-consult, #all-req-${oldConsultId} button`);
    
    if (renewBtn) {
        renewBtn.disabled = true;
        renewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    try {
        const getRes = await fetch(`${API_URL}/api/consultations/${oldConsultId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!getRes.ok) {
            throw new Error('Could not get consultation details');
        }
        
        const consultation = await getRes.json();
        const doctorId = consultation.doctor_id;
        
        if (!doctorId) {
            throw new Error('Doctor not found for this consultation');
        }
        
        const doctorRes = await fetch(`${API_URL}/api/doctors/${doctorId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let doctorName = 'Doctor';
        if (doctorRes.ok) {
            const doctor = await doctorRes.json();
            doctorName = doctor.name;
        }
        
        await sendRequest(doctorId, doctorName);
        
        const expiredElement = document.getElementById(`all-req-${oldConsultId}`);
        if (expiredElement) {
            expiredElement.remove();
        }
        
        showNotification(
            '🔄 Request Sent',
            `New consultation request sent to ${doctorName}`,
            null
        );
        
        await loadRequests();
        await loadConsultations();
        
    } catch (error) {
        console.error('Renewal error:', error);
        showNotification(
            '❌ Renewal Failed',
            error.message || 'Could not renew consultation. Please request a new doctor.',
            null
        );
    } finally {
        if (renewBtn) {
            renewBtn.disabled = false;
            renewBtn.innerHTML = 'Request Again';
        }
    }
}
        
// ===========================
// PAYMENT LOGIC
// ===========================
document.getElementById('payBtn')?.addEventListener('click', async () => {
    const phone = document.getElementById('mpesaNumber')?.value.trim();
    const btn   = document.getElementById('payBtn');

    clearPaymentMessages();

    if (!phone || phone.length < 10) {
        showPaymentError('Enter a valid M-PESA number e.g. 0712345678');
        return;
    }

    if (!currentConsultId) {
        showPaymentError('No active consultation found. Please request a consultation first.');
        return;
    }

    btn.disabled  = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending STK Push...';

    try {
        const res = await fetch(`${API_URL}/api/mpesa/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phone, consultation_id: currentConsultId, amount: 1 })
        });

        const data = await res.json();

        if (!res.ok) {
            showPaymentError(data.message || 'Payment failed. Try again.');
        } else {
            showPaymentSuccess('✅ STK Push sent! Check your phone and enter your M-PESA PIN.');

            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                if (attempts > 12) {
                    clearInterval(poll);
                    showPaymentError('Payment timeout. Please try again.');
                    return;
                }
                try {
                    const checkRes = await fetch(
                        `${API_URL}/api/mpesa/status/${currentConsultId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (checkRes.ok) {
                        const statusData = await checkRes.json();
                        if (statusData.status === 'paid') {
                            clearInterval(poll);
                            closeModal('paymentModal');
                            showNotification('💳 Payment Confirmed!', 'Waiting for doctor to start the session.', null);
                            loadRequests();
                            loadConsultations();
                        }
                    }
                } catch (pollErr) {
                    console.error('Polling error:', pollErr);
                }
            }, 5000);
        }

    } catch (err) {
        showPaymentError('Cannot connect to server.');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Send STK Push';
    }
});

// ===========================
// LOAD CONSULTATION REQUESTS (UPDATED WITH DECLINED STYLES)
// ===========================
async function loadRequests() {
    const list = document.getElementById('requestsList');
    if (!list) return;

    list.innerHTML = '<p>Loading requests...</p>';

    try {
        const res  = await fetch(`${API_URL}/api/consultations/patient/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok || !Array.isArray(data) || data.length === 0) {
            list.innerHTML = '<div class="empty-state"><h3>No requests yet</h3></div>';
            return;
        }

        const statusLabel = (s) => s === 'expired' ? 'EXPIRED' : s === 'declined' ? 'DECLINED' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        list.innerHTML = data.map(req => `
            <div class="request-card ${req.status === 'expired' || req.status === 'declined' ? 'expired-card' : ''}">
                <div class="request-info">
                    <h4>Consultation #${req.id}</h4>
                    <p><strong>Doctor:</strong> ${req.doctor_name || 'Unknown Doctor'}</p>
                    <p>
                        <span class="request-status" style="
                            background: ${
                                req.status === 'requested'  ? '#fff3cd' :
                                req.status === 'accepted'   ? '#d4edda' :
                                req.status === 'paid'       ? '#cce5ff' :
                                req.status === 'in_progress'? '#e2d9f3' :
                                req.status === 'expired'    ? '#fee2e2' :
                                req.status === 'declined'   ? '#fee2e2' :
                                req.status === 'completed'  ? '#d1e7dd' :
                                '#d6d8db'
                            };
                            color: ${
                                req.status === 'requested'  ? '#856404' :
                                req.status === 'accepted'   ? '#155724' :
                                req.status === 'paid'       ? '#004085' :
                                req.status === 'in_progress'? '#6f42c1' :
                                req.status === 'expired'    ? '#dc2626' :
                                req.status === 'declined'   ? '#dc2626' :
                                req.status === 'completed'  ? '#0f5132' :
                                '#383d41'
                            };
                            padding: 6px 12px;
                            border-radius: 20px;
                            font-size: 0.75rem;
                            font-weight: 600;
                            display: inline-block;
                        ">
                            ${req.status === 'expired' ? '⏰ ' : req.status === 'declined' ? '❌ ' : ''}${statusLabel(req.status)}
                        </span>
                    </p>
                    <small>${new Date(req.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</small>
                </div>

                ${req.status === 'accepted' ? `
                    <button class="btn-consult" onclick="openPaymentModal(${req.id}, '${req.doctor_name}')">
                        💳 Pay Now
                    </button>` : ''}

                ${req.status === 'in_progress' ? `
                    <a href="consult.html?id=${req.id}">
                        <button class="btn-consult" style="background: #7c3aed;">
                            💬 Join Room
                        </button>
                    </a>` : ''}
                    
                ${req.status === 'expired' ? `
                    <button class="btn-consult" onclick="renewConsultation(${req.id})" style="background: #059669;">
                        🔄 Request Again
                    </button>` : ''}
            </div>
        `).join('');

    } catch (err) {
        list.innerHTML = '<p>Error loading requests.</p>';
    }
}

// ===========================
// LOAD CONSULTATIONS (UPDATED WITH DECLINED STYLES)
// ===========================
async function loadConsultations() {
    const container = document.getElementById('consultationList');
    if (!container) return;

    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res    = await fetch(`${API_URL}/api/consultations/patient/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data   = await res.json();
        const active = Array.isArray(data)
            ? data.filter(c => ['paid', 'in_progress', 'completed', 'expired', 'declined'].includes(c.status))
            : [];

        if (!active.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No consultations</h3>
                    <p>Your consultation history will appear here.</p>
                </div>`;
            return;
        }

        container.innerHTML = active.map(c => `
            <div class="request-card ${c.status === 'expired' || c.status === 'declined' ? 'expired-card' : ''}">
                <div class="request-info">
                    <h4>Consultation #${c.id}</h4>
                    <p><strong>Doctor:</strong> ${c.doctor_name || 'Unknown'}</p>
                    <p>
                        <span class="request-status" style="
                            background: ${
                                c.status === 'paid'        ? '#cce5ff' :
                                c.status === 'in_progress' ? '#e2d9f3' :
                                c.status === 'completed'   ? '#d1e7dd' :
                                c.status === 'expired'     ? '#fee2e2' :
                                c.status === 'declined'    ? '#fee2e2' :
                                '#d6d8db'
                            };
                            color: ${
                                c.status === 'paid'        ? '#004085' :
                                c.status === 'in_progress' ? '#6f42c1' :
                                c.status === 'completed'   ? '#0f5132' :
                                c.status === 'expired'     ? '#dc2626' :
                                c.status === 'declined'    ? '#dc2626' :
                                '#383d41'
                            };
                            padding: 6px 12px;
                            border-radius: 20px;
                            font-size: 0.75rem;
                            font-weight: 600;
                            display: inline-block;
                        ">
                            ${c.status === 'expired' ? '⏰ ' : c.status === 'declined' ? '❌ ' : ''}${c.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                    </p>
                    <small>${new Date(c.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</small>
                </div>
                <div>
                    ${c.status === 'paid' ? `
                        <p style="color: #004085; font-size: 0.85rem;">⏳ Waiting for doctor to start session</p>
                    ` : ''}
                    ${c.status === 'in_progress' ? `
                        <a href="consult.html?id=${c.id}">
                            <button class="btn-consult">💬 Join Room</button>
                        </a>` : ''}
                    ${c.status === 'completed' ? `
                        <p style="color: var(--muted); font-size: 0.85rem;">✅ Session completed</p>` : ''}
                    ${c.status === 'expired' ? `
                        <p style="color: #dc2626; font-size: 0.85rem;">⏰ Consultation expired. Please request a new one.</p>` : ''}
                    ${c.status === 'declined' ? `
                        <p style="color: #dc2626; font-size: 0.85rem;">❌ Consultation was declined by the doctor. Please try another doctor.</p>` : ''}
                </div>
            </div>
        `).join('');

    } catch (err) {
        container.innerHTML = '<p>Error loading consultations.</p>';
    }
}

// ===========================
// LOAD PRESCRIPTIONS
// ===========================
async function loadPrescriptions() {
    const container = document.getElementById('prescriptionList');
    if (!container) return;

    container.innerHTML = '<div class="loading-state"><p>Fetching your prescriptions...</p></div>';

    try {
        const response      = await fetch(`${API_URL}/api/prescriptions/patient/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data          = await response.json();
        const prescriptions = Array.isArray(data) ? data : (data.prescriptions || []);

        if (!response.ok || prescriptions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-prescription" style="font-size: 3rem; color: #ccc;"></i>
                    <p>No prescriptions found in your history.</p>
                </div>`;
            return;
        }

        container.innerHTML = prescriptions.map(p => `
            <div style="background: white; border: 1.5px solid #e5e7eb; padding: 20px; border-radius: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <h4 style="color: #059669; margin: 0;">${p.medication_name}</h4>
                        <span style="font-size: 0.8rem; background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 5px; display: inline-block; margin-top: 5px;">${p.dosage}</span>
                    </div>
                    <button onclick='printPrescription(${JSON.stringify(p)})'
                        style="background: #f3f4f6; color: #374151; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; white-space: nowrap;">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
                <div style="margin: 12px 0; font-size: 0.9rem;">
                    <p><strong>Diagnosis:</strong> ${p.diagnosis || '—'}</p>
                    <p><strong>Doctor:</strong> ${p.doctor_name || 'Medical Specialist'}</p>
                </div>
                <div style="background: #f9fafb; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #555; border-left: 3px solid #059669;">
                    <strong>Instructions:</strong> ${p.instructions}
                </div>
                <div style="margin-top: 12px; font-size: 0.75rem; color: #999; text-align: right;">
                    Issued: ${new Date(p.issued_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p>Error connecting to medical records.</p>';
    }
}

// ===========================
// LOAD PROFILE
// ===========================
function loadProfile() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('profileAvatar', getInitials(user.name || 'U'));
    set('profileName',   user.name  || '—');
    set('profileName2',  user.name  || '—');
    set('profileEmail',  user.email || '—');
    set('profileEmail2', user.email || '—');
    set('profileRole',   user.role  || '—');
    set('profileRole2',  user.role  || '—');
}

// ===========================
// MODAL HELPERS
// ===========================
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

document.getElementById('closePayment')?.addEventListener('click',  () => closeModal('paymentModal'));
document.getElementById('closeRequest')?.addEventListener('click',  () => closeModal('requestModal'));
document.getElementById('proceedPayBtn')?.addEventListener('click', () => {
    closeModal('requestModal');
    openModal('paymentModal');
});

// ===========================
// PAYMENT MODAL OPENER
// ===========================
function openPaymentModal(consultId, doctorName) {
    currentConsultId = consultId;
    const label = document.getElementById('doctorNameLabel');
    if (label) label.textContent = doctorName;
    openModal('paymentModal');
}

// ===========================
// MESSAGE HELPERS
// ===========================
function showPaymentError(msg) {
    const el = document.getElementById('paymentError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function showPaymentSuccess(msg) {
    const el = document.getElementById('paymentSuccess');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearPaymentMessages() {
    document.getElementById('paymentError')?.style.setProperty('display', 'none');
    document.getElementById('paymentSuccess')?.style.setProperty('display', 'none');
}

// ===========================
// NOTIFICATION TOAST HELPERS
// ===========================
function showNotification(title, message, onClick) {
    let toast = document.getElementById('notifToast');
    if (!toast) {
        toast = document.createElement('div');
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
                    <p id="notifTitle" style="font-weight:700; margin:0 0 4px; font-size:0.95rem;"></p>
                    <p id="notifMessage" style="margin:0; font-size:0.85rem; color:#6b7280;"></p>
                </div>
                <button onclick="closeNotif()" style="background:none; border:none; cursor:pointer; color:#9ca3af; font-size:1.1rem; margin-left:auto;">✕</button>
            </div>
        `;
        document.body.appendChild(toast);
    }

    const titleEl = document.getElementById('notifTitle');
    const msgEl = document.getElementById('notifMessage');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    notifCallback = onClick;
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
// SOCKET.IO NOTIFICATIONS (UPDATED WITH CONSULTATION_DECLINED)
// ===========================
if (typeof io !== 'undefined' && user?.id) {
    const notifSocket = io(API_URL, { transports: ['websocket'] });

    notifSocket.on('connect', () => {
        console.log('🔔 Connected:', notifSocket.id);
        notifSocket.emit('join_user_room', user.id);
        loadNotificationCounts();
    });

    notifSocket.on('consultation_accepted', (data) => {
        console.log('🔥 consultation_accepted:', data);
        currentConsultId = data.consultation_id;

        showNotification(
            '✅ Doctor Accepted!',
            'Your request was accepted. Tap to pay now.',
            () => {
                const label = document.getElementById('doctorNameLabel');
                if (label) label.textContent = 'Your Doctor';
                openModal('paymentModal');
            }
        );
        updateNotifBadge('accepted');
        playNotificationSound();
        loadRequests();
    });

    notifSocket.on('consultation_started', (data) => {
        console.log('🔥 consultation_started:', data);
        showNotification(
            '🩺 Session Started!',
            'Your consultation has started. Join now!',
            () => { window.location.href = `consult.html?id=${data.consultation_id}`; }
        );
        updateNotifBadge('started');
        playNotificationSound();
        loadConsultations();
        loadRequests();
    });

    notifSocket.on('consultation_expired', (data) => {
        console.log('⏰ Consultation expired:', data);
        
        showNotification(
            '⏰ Consultation Expired!',
            data.message || 'Your consultation request has expired. Please request a new one.',
            () => {
                const requestsLink = document.querySelector('.nav-link[data-section="requests"]');
                if (requestsLink) requestsLink.click();
            }
        );
        
        updateNotifBadge('expired');
        playNotificationSound();
        loadRequests();
        loadConsultations();
        loadDoctors();
    });

    // ✅ ADDED: Consultation Declined Listener
    notifSocket.on('consultation_declined', (data) => {
        console.log('❌ Consultation declined:', data);
        
        showNotification(
            '❌ Request Declined',
            data.message || 'Your consultation request was declined by the doctor. Please try another doctor.',
            () => {
                const doctorsLink = document.querySelector('.nav-link[data-section="dashboard"]');
                if (doctorsLink) doctorsLink.click();
            }
        );
        
        updateNotifBadge('declined');
        playNotificationSound();
        loadRequests();
        loadConsultations();
        loadDoctors();
    });

    notifSocket.on('connect_error', (err) => {
        console.error('❌ Socket error:', err.message);
    });
}

// ===========================
// LOGOUT
// ===========================
document.querySelector('.logout-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'index.html';
});

// ===========================
// INIT
// ===========================
loadNotificationCounts();
loadDoctors();

// ===========================
// PRINT PRESCRIPTION
// ===========================
function printPrescription(p) {
    const printWindow = window.open('', '_blank');
    const html = `
        <html>
        <head>
            <title>Prescription - ${p.medication_name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #2e7d32; padding-bottom: 20px; }
                .logo { font-size: 28px; font-weight: bold; color: #2e7d32; }
                .details { margin: 30px 0; display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f8f9fa; }
                .instructions { margin-top: 30px; padding: 20px; background: #f9fafb; border-left: 5px solid #2e7d32; }
                .footer { margin-top: 100px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">afyaConnect</div>
                <p>Digital Health Platform | Official Medical Record</p>
            </div>
            <div class="details">
                <div>
                    <p><strong>Patient:</strong> ${user?.name || 'N/A'}</p>
                    <p><strong>Date Issued:</strong> ${new Date(p.issued_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Doctor:</strong> ${p.doctor_name || 'Medical Officer'}</p>
                    <p><strong>Ref:</strong> RX-${p.id}</p>
                </div>
            </div>
            <td>
                <thead>
                    <tr><th>Diagnosis</th><th>Medication</th><th>Dosage</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${p.diagnosis || '—'}</td>
                        <td>${p.medication_name}</td>
                        <td>${p.dosage}</td>
                    </tr>
                </tbody>
            </table>
            <div class="instructions">
                <h3>Doctor's Instructions:</h3>
                <p>${p.instructions}</p>
            </div>
            <div class="footer">
                <p>Computer-generated prescription via afyaConnect. Ref: RX-${p.id}</p>
            </div>
            <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
}