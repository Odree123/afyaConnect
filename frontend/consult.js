// ===========================
// API URL
// ===========================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://afyaconnect-backend.onrender.com';

const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || '{}');

// ===========================
// GET CONSULTATION ID FROM URL
// ===========================
const urlParams      = new URLSearchParams(window.location.search);
const consultationId = urlParams.get('id');

if (!consultationId) window.location.href = 'dashboard.html';

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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

// ===========================
// PRESCRIPTION SIDEBAR TOGGLE (mobile)
// ===========================
function setupRxToggle() {
    const rxSidebar     = document.getElementById('doctorOnlySection');
    const toggleMobile  = document.getElementById('toggleRxBtn');
    const toggleDesktop = document.getElementById('toggleRxBtnDesktop');

    function toggleRx() {
        rxSidebar?.classList.toggle('rx-open');
    }

    toggleMobile?.addEventListener('click',  toggleRx);
    toggleDesktop?.addEventListener('click', toggleRx);
}

// ===========================
// ROLE-BASED SETUP
// ===========================
const isDoctor  = user.role === 'Doctor';
const isPatient = user.role === 'Patient';

if (isPatient) {
    // Hide prescription sidebar entirely for patients
    const rxSidebar = document.getElementById('doctorOnlySection');
    if (rxSidebar) rxSidebar.style.display = 'none';

    // Collapse grid to single column
    const container = document.querySelector('.consultation-container');
    if (container) container.style.gridTemplateColumns = '1fr';
}

if (isDoctor) {
    // Show toggle buttons for doctors
    const toggleMobile  = document.getElementById('toggleRxBtn');
    const toggleDesktop = document.getElementById('toggleRxBtnDesktop');
    if (toggleMobile)  toggleMobile.style.display  = 'flex';
    if (toggleDesktop) toggleDesktop.style.display = 'flex';
}

setupRxToggle();

// ===========================
// SOCKET.IO
// ===========================
const socket = io(API_URL);

socket.emit('join_room', consultationId);

socket.on('receive_message', (msg) => {
    // Hide empty-chat placeholder on first real message
    const emptyChat = document.getElementById('emptyChat');
    if (emptyChat) emptyChat.style.display = 'none';

    appendMessage(msg);
    scrollToBottom();
});

// ===========================
// LOAD EXISTING MESSAGES
// ===========================
async function loadMessages() {
    try {
        const res = await fetch(`${API_URL}/api/messages/${consultationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        const container = document.getElementById('chatMessages');
        if (!container) return;

        container.innerHTML = '';

        if (!Array.isArray(messages) || messages.length === 0) {
            container.innerHTML = `
                <div class="empty-chat" id="emptyChat">
                    <i class="fas fa-comment-medical" style="font-size:2rem; margin-bottom:8px; display:block;"></i>
                    No messages yet. Start the conversation!
                </div>`;
            return;
        }

        messages.forEach(msg => appendMessage(msg));
        scrollToBottom();
    } catch (err) {
        console.error('Error loading messages:', err);
    }
}

// ===========================
// APPEND MESSAGE TO CHAT
// ===========================
function appendMessage(msg) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    // Remove empty state if present
    const emptyChat = document.getElementById('emptyChat');
    if (emptyChat) emptyChat.remove();

    const isMe     = msg.sender_id === user.id;
    const cssClass = isMe ? 'patient' : 'doctor';
    const time     = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = `msg ${cssClass}`;
    div.innerHTML = `
        <div>${msg.message}</div>
        <div style="font-size:0.7rem; opacity:0.6; margin-top:4px; text-align:${isMe ? 'right' : 'left'};">
            ${msg.sender_name || (isMe ? 'You' : 'Doctor')} · ${time}
        </div>
    `;
    container.appendChild(div);
}

// ===========================
// SEND MESSAGE
// ===========================
function sendMessage() {
    const input   = document.getElementById('messageInput');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    socket.emit('send_message', {
        consultation_id: consultationId,
        sender_id:       user.id,
        sender_role:     user.role,
        message
    });

    input.value = '';
    input.focus();
}

document.getElementById('sendBtn')?.addEventListener('click', sendMessage);

document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// ===========================
// SCROLL TO BOTTOM
// ===========================
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;
}

// ===========================
// PRESCRIPTION (Doctor only)
// ===========================
document.getElementById('sendPrescriptionBtn')?.addEventListener('click', async () => {
    const diagnosis    = document.getElementById('diagnosis')?.value.trim();
    const medName      = document.getElementById('medName')?.value.trim();
    const dosage       = document.getElementById('dosage')?.value.trim();
    const instructions = document.getElementById('instructions')?.value.trim();
    const successEl    = document.getElementById('prescSuccess');
    const errorEl      = document.getElementById('prescError');

    if (successEl) successEl.style.display = 'none';
    if (errorEl)   errorEl.style.display   = 'none';

    if (!diagnosis || !medName || !dosage || !instructions) {
        if (errorEl) { errorEl.textContent = 'Please fill in all prescription fields.'; errorEl.style.display = 'block'; }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/prescriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                consultation_id: consultationId,
                diagnosis,
                medication_name: medName,
                dosage,
                instructions
            })
        });

        if (res.ok) {
            if (successEl) { successEl.textContent = '✅ Prescription sent!'; successEl.style.display = 'block'; }
            // Clear fields
            ['diagnosis', 'medName', 'dosage', 'instructions'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            setTimeout(() => { if (successEl) successEl.style.display = 'none'; }, 3000);
        } else {
            const data = await res.json();
            if (errorEl) { errorEl.textContent = data || 'Failed to send prescription.'; errorEl.style.display = 'block'; }
        }
    } catch (err) {
        console.error(err);
        if (errorEl) { errorEl.textContent = 'Server error.'; errorEl.style.display = 'block'; }
    }
});

// ===========================
// END CONSULTATION (Doctor only)
// ===========================
document.getElementById('endConsultationBtn')?.addEventListener('click', async () => {
    if (!confirm('End this consultation?')) return;

    try {
        const res = await fetch(`${API_URL}/api/consultations/complete/${consultationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            alert('Consultation ended.');
            window.location.href = 'doctor.html';
        } else {
            alert('Could not end consultation.');
        }
    } catch (err) {
        console.error(err);
    }
});

// ===========================
// EXIT ROOM (Patient)
// ===========================
document.getElementById('exitRoomBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to leave the consultation room?')) {
        window.location.href = isDoctor ? 'doctor.html' : 'dashboard.html';
    }
});

// ===========================
// INIT
// ===========================
loadMessages();