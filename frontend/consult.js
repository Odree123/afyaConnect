const API_URL = 'http://localhost:5000';
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || '{}');

// Get consultation ID from URL
const urlParams      = new URLSearchParams(window.location.search);
const consultationId = urlParams.get('id');

if (!consultationId) window.location.href = 'consult.html';

// Hide prescription sidebar if patient
if (user.role === 'Patient') {
    const sidebar = document.getElementById('doctorOnlySection');
    if (sidebar) {
        sidebar.style.display = 'none';
        document.querySelector('.consultation-container').style.gridTemplateColumns = '1fr';
    }
}

// ===========================
// SOCKET.IO
// ===========================
const socket = io(API_URL);

// Join the consultation room
socket.emit('join_room', consultationId);

// Receive messages
socket.on('receive_message', (msg) => {
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

        // Clear placeholder messages
        container.innerHTML = '';

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
    const isMe      = msg.sender_id === user.id;
    const cssClass  = isMe ? 'patient' : 'doctor';
    const time      = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = `msg ${cssClass}`;
    div.innerHTML = `
        <div>${msg.message}</div>
        <div style="font-size:0.7rem; opacity:0.6; margin-top:4px; text-align:${isMe ? 'right' : 'left'}">
            ${msg.sender_name || (isMe ? 'You' : 'Doctor')} · ${time}
        </div>
    `;
    container.appendChild(div);
}

// ===========================
// SEND MESSAGE
// ===========================
function sendMessage() {
    const input   = document.querySelector('.chat-input input');
    const message = input.value.trim();
    if (!message) return;

    socket.emit('send_message', {
        consultation_id: consultationId,
        sender_id:       user.id,
        sender_role:     user.role,
        message
    });

    input.value = '';
}

// Send on button click
document.querySelector('.chat-input .btn-consult').addEventListener('click', sendMessage);

// Send on Enter key
document.querySelector('.chat-input input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});



// ===========================
// SCROLL TO BOTTOM
// ===========================
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

// ===========================
// PRESCRIPTION (Doctor only)
// ===========================
const sendPrescriptionBtn = document.getElementById('sendPrescriptionBtn');
if (sendPrescriptionBtn) {
    sendPrescriptionBtn.addEventListener('click', async () => {
        const diagnosis    = document.getElementById('diagnosis').value.trim();
        const medName      = document.getElementById('medName').value.trim();
        const dosage       = document.getElementById('dosage').value.trim();
        const instructions = document.getElementById('instructions').value.trim();

        if (!diagnosis || !medName || !dosage || !instructions) {
            alert('Please fill in all prescription fields.');
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
                alert('✅ Prescription sent successfully!');
                document.getElementById('diagnosis').value    = '';
                document.getElementById('medName').value      = '';
                document.getElementById('dosage').value       = '';
                document.getElementById('instructions').value = '';
            } else {
                const data = await res.json();
                alert(data || 'Failed to send prescription.');
            }
        } catch (err) {
            console.error(err);
            alert('Server error.');
        }
    });
}

// ===========================
// END CONSULTATION (Doctor only)
// ===========================
const endBtn = document.getElementById('endConsultationBtn');
if (endBtn) {
    endBtn.addEventListener('click', async () => {
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
}
document.getElementById('exitRoomBtn')?.addEventListener('click', () => {
    // 1. (Optional) Confirm leaving if session is still active
    const confirmExit = confirm("Are you sure you want to leave the consultation room?");
    
    if (confirmExit) {
        // 2. Redirect back to the patient dashboard
        // Ensure the filename matches your actual dashboard file
        window.location.href = 'dashboard.html'; 
    }
});
// ===========================
// INIT
// ===========================
loadMessages();