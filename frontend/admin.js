const API_URL = 'http://localhost:5000';

// ===========================
// AUTH GUARD — Admin only
// ===========================
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user || user.role !== 'Admin') {
    alert('Access denied. Admins only.');
    window.location.href = 'index.html';
}

// ===========================
// SET ADMIN INFO
// ===========================
function getInitials(name) {
    return (name || 'AD').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

document.getElementById('adminName').textContent  = user.name;
document.getElementById('adminEmail').textContent = user.email;
document.getElementById('adminAvatar').textContent = getInitials(user.name);

// ===========================
// CURRENT SECTION TRACKER
// ===========================
let currentSection = 'overview';

// ===========================
// SIDEBAR NAVIGATION
// ===========================
document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(link.dataset.section);
    });
});

function switchSection(section) {
    currentSection = section;

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-section="${section}"]`);
    if (activeLink) activeLink.classList.add('active');

    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`section-${section}`);
    if (target) target.style.display = 'block';

    const titles = {
        overview:      ['Overview', 'System statistics and activity'],
        users:         ['Patients', 'Manage all registered patients'],
        doctors:       ['Doctors', 'Manage all registered doctors'],
        consultations: ['Consultations', 'View and manage all consultations'],
        prescriptions: ['Prescriptions', 'View all issued prescriptions'],
        payments:      ['Payments', 'Monitor M-PESA payment records']
    };

    document.getElementById('pageTitle').textContent    = titles[section]?.[0] || section;
    document.getElementById('pageSubtitle').textContent = titles[section]?.[1] || '';

    loadSection(section);
}

function refreshCurrentSection() {
    loadSection(currentSection);
}

function loadSection(section) {
    switch (section) {
        case 'overview':      loadStats(); loadRecentConsultations(); break;
        case 'users':         loadUsers('Patient'); break;
        case 'doctors':       loadUsers('Doctor'); break;
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
        const res  = await fetch(`${API_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        document.getElementById('statPatients').textContent      = data.total_patients      || 0;
        document.getElementById('statDoctors').textContent       = data.total_doctors       || 0;
        document.getElementById('statConsultations').textContent = data.total_consultations || 0;
        document.getElementById('statPrescriptions').textContent = data.total_prescriptions || 0;
        document.getElementById('statPaid').textContent          = data.paid_consultations  || 0;

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ===========================
// LOAD RECENT CONSULTATIONS (overview)
// ===========================
async function loadRecentConsultations() {
    const container = document.getElementById('recentConsultations');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/admin/consultations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const recent = data.slice(0, 8);

        if (!recent.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h4>No consultations yet</h4></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#ID</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(c => `
                        <tr>
                            <td><strong>#${c.id}</strong></td>
                            <td>${c.patient_name || '—'}</td>
                            <td>${c.doctor_name  || '—'}</td>
                            <td><span class="badge ${c.status}">${c.status.replace('_', ' ')}</span></td>
                            <td>${new Date(c.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading consultations.</p></div>';
    }
}

// ===========================
// LOAD USERS (Patients or Doctors)
// ===========================
async function loadUsers(role) {
    const containerId = role === 'Doctor' ? 'doctorsTable' : 'usersTable';
    const container   = document.getElementById(containerId);
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const filtered = data.filter(u => u.role === role);

        if (!filtered.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><h4>No ${role}s found</h4></div>`;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        ${role === 'Doctor' ? '<th>Specialty</th>' : ''}
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(u => `
                        <tr id="user-row-${u.id}">
                            <td><strong>#${u.id}</strong></td>
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td>${u.phone || '—'}</td>
                            ${role === 'Doctor' ? `<td>${u.specialization || '—'}</td>` : ''}
                            <td>
                                <span class="badge ${u.is_available ? 'active' : 'inactive'}">
                                    ${u.is_available ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>${new Date(u.created_at).toLocaleDateString('en-KE')}</td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn-sm edit" onclick="openRoleModal(${u.id}, '${u.name}', '${u.role}')">
                                        <i class="fas fa-user-tag"></i> Role
                                    </button>
                                    <button class="btn-sm toggle" onclick="toggleUser(${u.id}, ${u.is_available})">
                                        ${u.is_available ? '<i class="fas fa-ban"></i> Deactivate' : '<i class="fas fa-check"></i> Activate'}
                                    </button>
                                    <button class="btn-sm delete" onclick="confirmDelete(${u.id}, '${u.name}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading users.</p></div>';
    }
}

// ===========================
// LOAD ALL CONSULTATIONS
// ===========================
let allConsultations = [];

async function loadConsultations() {
    const container = document.getElementById('consultationsTable');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/admin/consultations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allConsultations = await res.json();
        renderConsultations(allConsultations);
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading consultations.</p></div>';
    }
}

function renderConsultations(data) {
    const container = document.getElementById('consultationsTable');

    if (!data.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🩺</div><h4>No consultations found</h4></div>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>M-PESA ID</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(c => `
                    <tr>
                        <td><strong>#${c.id}</strong></td>
                        <td>${c.patient_name || '—'}</td>
                        <td>${c.doctor_name  || '—'}</td>
                        <td><span class="badge ${c.status}">${c.status.replace('_', ' ')}</span></td>
                        <td style="font-size:0.78rem; color: var(--muted);">${c.mpesa_checkout_id || '—'}</td>
                        <td>${new Date(c.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterConsultations() {
    const status = document.getElementById('statusFilter').value;
    const filtered = status ? allConsultations.filter(c => c.status === status) : allConsultations;
    renderConsultations(filtered);
}

// ===========================
// LOAD PRESCRIPTIONS
// ===========================
async function loadPrescriptions() {
    const container = document.getElementById('prescriptionsTable');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/admin/prescriptions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h4>No prescriptions yet</h4></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#ID</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Diagnosis</th>
                        <th>Issued</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(p => `
                        <tr>
                            <td><strong>RX-${p.id}</strong></td>
                            <td>${p.patient_name || '—'}</td>
                            <td>${p.doctor_name  || '—'}</td>
                            <td>${p.medication_name}</td>
                            <td>${p.dosage}</td>
                            <td>${p.diagnosis || '—'}</td>
                            <td>${new Date(p.issued_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading prescriptions.</p></div>';
    }
}

// ===========================
// LOAD PAYMENTS
// ===========================
async function loadPayments() {
    const container = document.getElementById('paymentsTable');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res  = await fetch(`${API_URL}/api/admin/consultations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const paid = data.filter(c => c.mpesa_checkout_id);

        if (!paid.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><h4>No payment records yet</h4></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Consultation</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>M-PESA Checkout ID</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${paid.map(c => `
                        <tr>
                            <td><strong>#${c.id}</strong></td>
                            <td>${c.patient_name || '—'}</td>
                            <td>${c.doctor_name  || '—'}</td>
                            <td style="font-size:0.78rem; font-family: monospace;">${c.mpesa_checkout_id}</td>
                            <td><span class="badge ${c.status}">${c.status.replace('_', ' ')}</span></td>
                            <td>${new Date(c.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = '<div class="empty-state"><p>Error loading payments.</p></div>';
    }
}

// ===========================
// TOGGLE USER ACTIVE/INACTIVE
// ===========================
async function toggleUser(userId, currentStatus) {
    try {
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/toggle`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadSection(currentSection);
        } else {
            alert('Could not update user status.');
        }
    } catch (err) {
        alert('Server error.');
    }
}

// ===========================
// ROLE MODAL
// ===========================
let selectedUserId = null;

function openRoleModal(userId, userName, currentRole) {
    selectedUserId = userId;
    document.getElementById('roleUserName').textContent = userName;
    document.getElementById('roleSelect').value         = currentRole;
    document.getElementById('roleModal').classList.add('active');
}

document.getElementById('saveRoleBtn').addEventListener('click', async () => {
    const newRole = document.getElementById('roleSelect').value;
    const btn     = document.getElementById('saveRoleBtn');

    btn.disabled  = true;
    btn.textContent = 'Saving...';

    try {
        const res = await fetch(`${API_URL}/api/admin/users/${selectedUserId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role: newRole })
        });

        if (res.ok) {
            closeModal('roleModal');
            loadSection(currentSection);
        } else {
            alert('Could not update role.');
        }
    } catch (err) {
        alert('Server error.');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Save Role';
    }
});

// ===========================
// DELETE USER
// ===========================
let deleteUserId = null;

function confirmDelete(userId, userName) {
    deleteUserId = userId;
    document.getElementById('confirmTitle').textContent   = 'Delete User';
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${userName}"? This cannot be undone.`;
    document.getElementById('confirmModal').classList.add('active');

    document.getElementById('confirmBtn').onclick = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${deleteUserId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                closeConfirm();
                loadSection(currentSection);
            } else {
                alert('Could not delete user.');
            }
        } catch (err) {
            alert('Server error.');
        }
    };
}

function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('active');
}

// ===========================
// FILTER TABLE (search)
// ===========================
function filterTable(tableId, query) {
    const container = document.getElementById(tableId);
    const rows      = container.querySelectorAll('tbody tr');
    const q         = query.toLowerCase();

    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

// ===========================
// MODAL HELPERS
// ===========================
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

// ===========================
// LOGOUT
// ===========================
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'index.html';
});

// ===========================
// INIT
// ===========================
loadStats();
loadRecentConsultations();