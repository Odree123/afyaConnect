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

if (!token || !user || user.role !== 'Admin') {
    alert('Access denied. Admins only.');
    window.location.href = 'index.html';
}

// ===========================
// HELPERS
// ===========================
function getInitials(name) {
    return (name || 'AD').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(str) {
    return new Date(str).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
}

function fmtDateShort(str) {
    return new Date(str).toLocaleDateString('en-KE');
}

function badgeHtml(status) {
    return `<span class="badge ${status}">${status.replace('_', ' ')}</span>`;
}

// ===========================
// MOBILE DETECTION
// ===========================
function isMobile() { return window.innerWidth <= 600; }

// ===========================
// INJECT MOBILE CARDS alongside a table container
// Call after injecting table HTML.
// fields: array of { label, value } pairs
// actions: HTML string for action buttons (optional)
// ===========================
function injectMobCards(container, rows) {
    // Remove any previous mob-cards-wrapper
    const old = container.querySelector('.mob-cards-wrapper');
    if (old) old.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'mob-cards-wrapper';

    rows.forEach(({ title, badge, fields, actions }) => {
        const card = document.createElement('div');
        card.className = 'mob-card';

        let html = `<div class="mob-card-title">
            <span class="mob-card-name">${title}</span>
            ${badge ? badge : ''}
        </div>`;

        fields.forEach(({ label, value }) => {
            if (!value || value === '—') return;
            html += `<div class="mob-card-row">
                <span class="mob-label">${label}</span>
                <span class="mob-value">${value}</span>
            </div>`;
        });

        if (actions) {
            html += `<div class="mob-card-actions">${actions}</div>`;
        }

        card.innerHTML = html;
        wrapper.appendChild(card);
    });

    container.appendChild(wrapper);
}

// ===========================
// SET ADMIN INFO
// ===========================
const initials = getInitials(user.name);

['adminName',  'adminEmail',  'adminAvatar',
 'adminAvatarMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'adminName')  el.textContent = user.name;
    if (id === 'adminEmail') el.textContent = user.email;
    if (id.includes('Avatar')) el.textContent = initials;
});

// ===========================
// SIDEBAR HAMBURGER
// ===========================
const hamburger = document.querySelector('.hamburger');
const sidebar   = document.querySelector('.sidebar');
const overlay   = document.querySelector('.sidebar-overlay');

function openSidebar()  { sidebar?.classList.add('open');    overlay?.classList.add('active');    document.body.style.overflow = 'hidden'; }
function closeSidebar() { sidebar?.classList.remove('open'); overlay?.classList.remove('active'); document.body.style.overflow = ''; }

hamburger?.addEventListener('click', openSidebar);
overlay?.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSidebar();
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

// ===========================
// SECTION TRACKING & NAV
// ===========================
let currentSection = 'overview';

document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(link.dataset.section);
        if (isMobile()) closeSidebar();
    });
});

function switchSection(section) {
    currentSection = section;

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-section="${section}"]`)?.classList.add('active');

    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`section-${section}`);
    if (target) target.style.display = 'block';

    const titles = {
        overview:      ['Overview',      'System statistics and activity'],
        users:         ['Patients',      'Manage all registered patients'],
        doctors:       ['Doctors',       'Manage all registered doctors'],
        consultations: ['Consultations', 'View and manage all consultations'],
        prescriptions: ['Prescriptions', 'View all issued prescriptions'],
        payments:      ['Payments',      'Monitor M-PESA payment records']
    };

    const t = titles[section] || [section, ''];
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('pageTitle',     t[0]);
    set('pageSubtitle',  t[1]);
    set('mobilePgTitle', t[0]);

    loadSection(section);
}

function refreshCurrentSection() { loadSection(currentSection); }

function loadSection(section) {
    switch (section) {
        case 'overview':      loadStats(); loadRecentConsultations(); break;
        case 'users':         loadUsers('Patient'); break;
        case 'doctors':       loadDoctors(); break;
        case 'consultations': loadConsultations(); break;
        case 'prescriptions': loadPrescriptions(); break;
        case 'payments':      loadPayments(); break;
    }
}

// ===========================
// LOAD STATS
// ===========================
async function loadStats() {
    try {
        const res  = await fetch(`${API_URL}/api/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('statPatients',      data.total_patients      || 0);
        set('statDoctors',       data.total_doctors       || 0);
        set('statConsultations', data.total_consultations || 0);
        set('statPrescriptions', data.total_prescriptions || 0);
        set('statPaid',          data.paid_consultations  || 0);
    } catch (err) { console.error('Error loading stats:', err); }
}

// ===========================
// RECENT CONSULTATIONS (overview)
// ===========================
async function loadRecentConsultations() {
    const container = document.getElementById('recentConsultations');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res    = await fetch(`${API_URL}/api/admin/consultations`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data   = await res.json();
        const recent = data.slice(0, 8);

        if (!recent.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h4>No consultations yet</h4></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr>
                    <th>#ID</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Date</th>
                </tr></thead>
                <tbody>
                    ${recent.map(c => `<tr>
                        <td><strong>#${c.id}</strong></td>
                        <td>${c.patient_name || '—'}</td>
                        <td>${c.doctor_name  || '—'}</td>
                        <td>${badgeHtml(c.status)}</td>
                        <td>${fmtDate(c.created_at)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;

        injectMobCards(container, recent.map(c => ({
            title:  `#${c.id} — ${c.patient_name || 'Patient'}`,
            badge:  badgeHtml(c.status),
            fields: [
                { label: 'Doctor',  value: c.doctor_name  || '—' },
                { label: 'Patient', value: c.patient_name || '—' },
                { label: 'Date',    value: fmtDate(c.created_at) },
            ]
        })));

    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading consultations.</p></div>';
    }
}

// ===========================
// LOAD DOCTORS
// ===========================
async function loadDoctors() {
    const container = document.getElementById('doctorsTable');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res     = await fetch(`${API_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data    = await res.json();
        const doctors = data.filter(u => u.role === 'Doctor');

        if (!doctors.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">👨‍⚕️</div><h4>No doctors found</h4></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr>
                    <th>#ID</th><th>Name</th><th>Email</th><th>Phone</th>
                    <th>Specialization</th><th>License</th><th>Status</th>
                    <th>Approval</th><th>Joined</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    ${doctors.map(d => `<tr id="user-row-${d.id}">
                        <td><strong>#${d.id}</strong></td>
                        <td>${d.name}</td>
                        <td>${d.email}</td>
                        <td>${d.phone || '—'}</td>
                        <td>${d.specialization || '—'}</td>
                        <td>${d.license_number || '—'}</td>
                        <td><span class="badge ${d.is_available ? 'active' : 'inactive'}">${d.is_available ? 'Active' : 'Inactive'}</span></td>
                        <td>${d.is_approved ? '<span class="badge approved">Approved</span>' : '<span class="badge pending">Pending</span>'}</td>
                        <td>${fmtDateShort(d.created_at)}</td>
                        <td>${doctorActions(d)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;

        injectMobCards(container, doctors.map(d => ({
            title:   d.name,
            badge:   d.is_approved ? '<span class="badge approved">Approved</span>' : '<span class="badge pending">Pending</span>',
            fields: [
                { label: 'Email',  value: d.email },
                { label: 'Phone',  value: d.phone || '—' },
                { label: 'Spec.',  value: d.specialization || '—' },
                { label: 'License',value: d.license_number || '—' },
                { label: 'Status', value: d.is_available ? 'Active' : 'Inactive' },
                { label: 'Joined', value: fmtDateShort(d.created_at) },
            ],
            actions: doctorActions(d)
        })));

    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading doctors.</p></div>';
    }
}

function doctorActions(d) {
    const escapedName = d.name.replace(/'/g, "\\'");
    return `<div class="action-btns">
        <button class="btn-sm view"   onclick="viewDoctor(${d.id})"><i class="fas fa-eye"></i> View</button>
        ${!d.is_approved && d.license_number
            ? `<button class="btn-sm approve" onclick="approveDoctor(${d.id})"><i class="fas fa-check"></i> Approve</button>` : ''}
        <button class="btn-sm toggle" onclick="toggleUser(${d.id}, ${d.is_available})">
            ${d.is_available ? '<i class="fas fa-ban"></i> Deactivate' : '<i class="fas fa-check"></i> Activate'}
        </button>
        <button class="btn-sm delete" onclick="confirmDelete(${d.id}, '${escapedName}')"><i class="fas fa-trash"></i></button>
    </div>`;
}

// ===========================
// LOAD USERS (Patients)
// ===========================
async function loadUsers(role) {
    const container = document.getElementById('usersTable');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res      = await fetch(`${API_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data     = await res.json();
        const filtered = data.filter(u => u.role === role);

        if (!filtered.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><h4>No ${role}s found</h4></div>`;
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr>
                    <th>#ID</th><th>Name</th><th>Email</th><th>Phone</th>
                    <th>Status</th><th>Joined</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    ${filtered.map(u => `<tr id="user-row-${u.id}">
                        <td><strong>#${u.id}</strong></td>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td>${u.phone || '—'}</td>
                        <td><span class="badge ${u.is_available ? 'active' : 'inactive'}">${u.is_available ? 'Active' : 'Inactive'}</span></td>
                        <td>${fmtDateShort(u.created_at)}</td>
                        <td>${patientActions(u)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;

        injectMobCards(container, filtered.map(u => ({
            title:  `#${u.id} — ${u.name}`,
            badge:  `<span class="badge ${u.is_available ? 'active' : 'inactive'}">${u.is_available ? 'Active' : 'Inactive'}</span>`,
            fields: [
                { label: 'Email',  value: u.email },
                { label: 'Phone',  value: u.phone || '—' },
                { label: 'Joined', value: fmtDateShort(u.created_at) },
            ],
            actions: patientActions(u)
        })));

    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading users.</p></div>';
    }
}

function patientActions(u) {
    const escapedName = u.name.replace(/'/g, "\\'");
    return `<div class="action-btns">
        <button class="btn-sm edit"   onclick="openRoleModal(${u.id}, '${escapedName}', '${u.role}')"><i class="fas fa-user-tag"></i> Role</button>
        <button class="btn-sm toggle" onclick="toggleUser(${u.id}, ${u.is_available})">
            ${u.is_available ? '<i class="fas fa-ban"></i> Deactivate' : '<i class="fas fa-check"></i> Activate'}
        </button>
        <button class="btn-sm delete" onclick="confirmDelete(${u.id}, '${escapedName}')"><i class="fas fa-trash"></i></button>
    </div>`;
}

// ===========================
// APPROVE DOCTOR
// ===========================
async function approveDoctor(id) {
    if (!confirm('Approve this doctor?')) return;
    try {
        const res  = await fetch(`${API_URL}/api/admin/doctors/${id}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        alert(res.ok ? (data.message || 'Doctor approved') : (data.message || 'Failed'));
        if (res.ok) loadDoctors();
    } catch (err) { alert('Server error.'); }
}

// ===========================
// VIEW DOCTOR
// ===========================
async function viewDoctor(id) {
    try {
        const res    = await fetch(`${API_URL}/api/admin/doctors/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error((await res.json()).message || 'Failed');
        const doctor = await res.json();

        const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.innerText = val; };
        set('docName',          doctor.name           || 'N/A');
        set('docEmail',         doctor.email          || 'N/A');
        set('docPhone',         doctor.phone          || '—');
        set('docSpecialization',doctor.specialization || '—');
        set('docLicense',       doctor.license_number || '—');

        const statusEl = document.getElementById('docStatus');
        if (statusEl) statusEl.innerHTML = doctor.is_approved
            ? '<span style="color:#059669;font-weight:600;">✅ Approved</span>'
            : '<span style="color:#f59e0b;font-weight:600;">⏳ Pending Approval</span>';

        const modal = document.getElementById('doctorModal');
        if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }

    } catch (err) { alert('Failed to load doctor details: ' + err.message); }
}

// ===========================
// ALL CONSULTATIONS
// ===========================
let allConsultations = [];

async function loadConsultations() {
    const container = document.getElementById('consultationsTable');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res        = await fetch(`${API_URL}/api/admin/consultations`, { headers: { 'Authorization': `Bearer ${token}` } });
        allConsultations = await res.json();
        renderConsultations(allConsultations);
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading consultations.</p></div>';
    }
}

function renderConsultations(data) {
    const container = document.getElementById('consultationsTable');
    if (!container) return;

    if (!data.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🩺</div><h4>No consultations found</h4></div>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead><tr>
                <th>#ID</th><th>Patient</th><th>Doctor</th>
                <th>Status</th><th>M-PESA ID</th><th>Date</th>
            </tr></thead>
            <tbody>
                ${data.map(c => `<tr>
                    <td><strong>#${c.id}</strong></td>
                    <td>${c.patient_name || '—'}</td>
                    <td>${c.doctor_name  || '—'}</td>
                    <td>${badgeHtml(c.status)}</td>
                    <td style="font-size:0.78rem;color:var(--muted);">${c.mpesa_checkout_id || '—'}</td>
                    <td>${fmtDate(c.created_at)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    injectMobCards(container, data.map(c => ({
        title:  `#${c.id} — ${c.patient_name || 'Patient'}`,
        badge:  badgeHtml(c.status),
        fields: [
            { label: 'Doctor',   value: c.doctor_name || '—' },
            { label: 'M-PESA',   value: c.mpesa_checkout_id || '—' },
            { label: 'Date',     value: fmtDate(c.created_at) },
        ]
    })));
}

function filterConsultations() {
    const status   = document.getElementById('statusFilter')?.value;
    const filtered = status ? allConsultations.filter(c => c.status === status) : allConsultations;
    renderConsultations(filtered);
}

// ===========================
// PRESCRIPTIONS
// ===========================
async function loadPrescriptions() {
    const container = document.getElementById('prescriptionsTable');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/admin/prescriptions`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();

        if (!data.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h4>No prescriptions yet</h4></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr>
                    <th>#ID</th><th>Patient</th><th>Doctor</th>
                    <th>Medication</th><th>Dosage</th><th>Diagnosis</th><th>Issued</th>
                </tr></thead>
                <tbody>
                    ${data.map(p => `<tr>
                        <td><strong>RX-${p.id}</strong></td>
                        <td>${p.patient_name || '—'}</td>
                        <td>${p.doctor_name  || '—'}</td>
                        <td>${p.medication_name}</td>
                        <td>${p.dosage}</td>
                        <td>${p.diagnosis || '—'}</td>
                        <td>${fmtDate(p.issued_at)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;

        injectMobCards(container, data.map(p => ({
            title:  `RX-${p.id} — ${p.medication_name}`,
            badge:  '',
            fields: [
                { label: 'Patient',   value: p.patient_name || '—' },
                { label: 'Doctor',    value: p.doctor_name  || '—' },
                { label: 'Dosage',    value: p.dosage },
                { label: 'Diagnosis', value: p.diagnosis || '—' },
                { label: 'Issued',    value: fmtDate(p.issued_at) },
            ]
        })));

    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading prescriptions.</p></div>';
    }
}

// ===========================
// PAYMENTS
// ===========================
async function loadPayments() {
    const container = document.getElementById('paymentsTable');
    if (!container) return;
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/admin/consultations`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const paid = data.filter(c => c.mpesa_checkout_id);

        if (!paid.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><h4>No payment records yet</h4></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead><tr>
                    <th>Consultation</th><th>Patient</th><th>Doctor</th>
                    <th>M-PESA Checkout ID</th><th>Status</th><th>Date</th>
                </tr></thead>
                <tbody>
                    ${paid.map(c => `<tr>
                        <td><strong>#${c.id}</strong></td>
                        <td>${c.patient_name || '—'}</td>
                        <td>${c.doctor_name  || '—'}</td>
                        <td style="font-size:0.78rem;font-family:monospace;">${c.mpesa_checkout_id}</td>
                        <td>${badgeHtml(c.status)}</td>
                        <td>${fmtDate(c.created_at)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;

        injectMobCards(container, paid.map(c => ({
            title:  `#${c.id} — ${c.patient_name || 'Patient'}`,
            badge:  badgeHtml(c.status),
            fields: [
                { label: 'Doctor',   value: c.doctor_name || '—' },
                { label: 'M-PESA',   value: c.mpesa_checkout_id },
                { label: 'Date',     value: fmtDate(c.created_at) },
            ]
        })));

    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading payments.</p></div>';
    }
}

// ===========================
// TOGGLE USER
// ===========================
async function toggleUser(userId) {
    try {
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/toggle`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) { loadSection(currentSection); }
        else { const d = await res.json(); alert(d.message || 'Could not update.'); }
    } catch (err) { alert('Server error.'); }
}

// ===========================
// ROLE MODAL
// ===========================
let selectedUserId = null;

function openRoleModal(userId, userName, currentRole) {
    selectedUserId = userId;
    const nameEl   = document.getElementById('roleUserName');
    const selectEl = document.getElementById('roleSelect');
    if (nameEl)   nameEl.textContent = userName;
    if (selectEl) selectEl.value     = currentRole;
    document.getElementById('roleModal')?.classList.add('active');
}

document.getElementById('saveRoleBtn')?.addEventListener('click', async () => {
    const newRole = document.getElementById('roleSelect')?.value;
    const btn     = document.getElementById('saveRoleBtn');
    if (!btn) return;
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
        const res = await fetch(`${API_URL}/api/admin/users/${selectedUserId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role: newRole })
        });
        if (res.ok) { closeModalById('roleModal'); loadSection(currentSection); }
        else { const d = await res.json(); alert(d.message || 'Could not update role.'); }
    } catch (err) { alert('Server error.'); }
    finally { btn.disabled = false; btn.textContent = 'Save Role'; }
});

// ===========================
// DELETE USER
// ===========================
let deleteUserId = null;

function confirmDelete(userId, userName) {
    deleteUserId = userId;
    const t = document.getElementById('confirmTitle');
    const m = document.getElementById('confirmMessage');
    if (t) t.textContent = 'Delete User';
    if (m) m.textContent = `Are you sure you want to delete "${userName}"? This cannot be undone.`;
    document.getElementById('confirmModal')?.classList.add('active');

    document.getElementById('confirmBtn').onclick = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${deleteUserId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { closeConfirm(); loadSection(currentSection); }
            else { const d = await res.json(); alert(d.message || 'Could not delete user.'); }
        } catch (err) { alert('Server error.'); }
    };
}

function closeConfirm() { document.getElementById('confirmModal')?.classList.remove('active'); }

// ===========================
// SEARCH FILTER
// ===========================
function filterTable(tableId, query) {
    const container = document.getElementById(tableId);
    if (!container) return;
    const q    = query.toLowerCase();
    const rows = container.querySelectorAll('tbody tr');
    rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    // Also filter mob-cards
    const cards = container.querySelectorAll('.mob-card');
    cards.forEach(card => { card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

// ===========================
// MODAL HELPERS
// ===========================
function openModal(id)      { document.getElementById(id)?.classList.add('active'); }
function closeModalById(id) { document.getElementById(id)?.classList.remove('active'); }

function closeModal(modalId) {
    const id = modalId || 'doctorModal';
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('active'); }
}

document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('active'); });
});

// ===========================
// LOGOUT
// ===========================
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'index.html';
});

// ===========================
// INIT
// ===========================
if (token && user && user.role === 'Admin') {
    loadStats();
    loadRecentConsultations();
}