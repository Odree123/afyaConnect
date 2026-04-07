// This ensures it works locally AND on the live site
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://afyaconnect-mlly.onrender.com';

// ===========================
// ELEMENT REFERENCES
// ===========================
const modalOverlay = document.getElementById('modalOverlay');
const loginView    = document.getElementById('loginView');
const signupView   = document.getElementById('signupView');

// ===========================
// OPEN / CLOSE MODAL
// ===========================
function openModal(view = 'login') {
    loginView.style.display  = view === 'login'  ? 'block' : 'none';
    signupView.style.display = view === 'signup' ? 'block' : 'none';
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    clearMessages();
}

document.getElementById('openLogin')?.addEventListener('click', () => openModal('login'));
document.getElementById('getStarted')?.addEventListener('click', () => openModal('login'));
document.getElementById('closeModal')?.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ===========================
// TOGGLE LOGIN / SIGNUP
// ===========================
document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    clearMessages();
    loginView.style.display  = 'none';
    signupView.style.display = 'block';
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    clearMessages();
    signupView.style.display = 'none';
    loginView.style.display  = 'block';
});

// ===========================
// MESSAGE HELPERS
// ===========================
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        el.className = 'error-message'; // Ensure CSS styling applies
    }
}

function showSuccess(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        el.className = 'success-message';
    }
}

function clearMessages() {
    ['loginError', 'loginSuccess', 'signupError', 'signupSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
}

function setLoading(btn, loading, defaultText) {
    btn.disabled    = loading;
    btn.textContent = loading ? 'Please wait...' : defaultText;
}

// Handle showing/hiding doctor-specific fields
function toggleDoctorFields() {
    const role = document.getElementById('regRole').value;
    const doctorFields = document.getElementById('doctorFields');
    if (doctorFields) {
        doctorFields.style.display = (role === 'Doctor') ? 'block' : 'none';
    }
}

// Add event listener for the role dropdown
document.getElementById('regRole')?.addEventListener('change', toggleDoctorFields);

// ===========================
// LOGIN FORM
// ===========================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    const btn      = e.target.querySelector('button[type="submit"]');

    setLoading(btn, true, 'Login');

    try {
        const res  = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showError('loginError', data.error || data.message || 'Login failed.');
        } else {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showSuccess('loginSuccess', `Welcome back, ${data.user.name}! Redirecting...`);

            setTimeout(() => {
                if (data.user.role === 'Admin') {
                    window.location.href = 'admin.html';
                } else if (data.user.role === 'Doctor') {
                    window.location.href = 'doctor.html';
                } else {        
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        }
    } catch (err) {
        showError('loginError', 'Connection error. Is the backend running?');
    } finally {
        setLoading(btn, false, 'Login');
    }
});

// ===========================
// SIGNUP FORM (CORRECTED)
// ===========================
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    // Standard Fields
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;
    const role     = document.getElementById('regRole').value;
    
    // Doctor Specific Fields (Mapping to Backend license_number)
    const license_number = document.getElementById('regLicense').value.trim();
    const specialization = document.getElementById('regSpecialization').value;

    const btn = e.target.querySelector('button[type="submit"]');

    // Validation
    if (password.length < 6) {
        showError('signupError', 'Password must be at least 6 characters.');
        return;
    }
    
    if (role === 'Doctor') {
        if (!license_number) {
            showError('signupError', 'Medical License Number is required for doctors.');
            return;
        }
        if (!specialization) {
            showError('signupError', 'Please select your specialization.');
            return;
        }
    }

    setLoading(btn, true, 'Create Account');

    try {
        const res = await fetch(`${API_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // CRITICAL: Keys must match userController.js destructuring
            body: JSON.stringify({ 
                name, 
                email, 
                phone, 
                password, 
                role, 
                license_number, // Matches backend
                specialization 
            })
        });

        const data = await res.json();

        if (!res.ok) {
            // Controller sends errors as { error: "msg" }, not { message: "msg" }
            showError('signupError', data.error || 'Registration failed. Please try again.');
        } else {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            const welcomeMsg = data.user.role === 'Doctor' 
                ? `Account created! Pending Admin approval.` 
                : `Account created! Welcome, ${data.user.name}!`;

            showSuccess('signupSuccess', welcomeMsg);

            setTimeout(() => {
                closeModal();
                if (data.user.role === "Doctor") {
                    window.location.href = "doctor.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            }, 2000);
        }
    } catch (err) {
        showError('signupError', 'Cannot connect to server. Check your backend.');
    } finally {
        setLoading(btn, false, 'Create Account');
    }
});