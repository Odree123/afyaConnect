const API_URL = 'http://localhost:5000';

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

// Open via navbar button
document.getElementById('openLogin').addEventListener('click', () => openModal('login'));

// Open via hero button
document.getElementById('getStarted').addEventListener('click', () => openModal('login'));

// Close via ✕ button
document.getElementById('closeModal').addEventListener('click', closeModal);

// Close by clicking outside the card
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Close with Escape key
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
    el.textContent = msg;
    el.style.display = 'block';
}

function showSuccess(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
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
            showError('loginError', data || 'Login failed. Please try again.');
        } else {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showSuccess('loginSuccess', `Welcome back, ${data.user.name}! Redirecting...`);

            setTimeout(() => {
                closeModal();

                const user = JSON.parse(localStorage.getItem('user'));
                console.log("Redirecting user:", user);

                setTimeout(() => {
                    if (data.user.role === 'Admin') {
                        window.location.href = 'admin.html';
                    } else if (data.user.role === 'Doctor') {
                        window.location.href = 'doctor.html';
                    } else {        
                        window.location.href = 'dashboard.html';
                    }
                }, 1500);
            }, 0);
        }
    } catch (err) {
        showError('loginError', 'Cannot connect to server. Make sure your backend is running.');
    } finally {
        setLoading(btn, false, 'Login');
    }
});

// ===========================
// SIGNUP FORM
// ===========================
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;
    const btn      = e.target.querySelector('button[type="submit"]');

    // Basic validation
    if (phone.length < 10) {
        showError('signupError', 'Please enter a valid phone number.');
        return;
    }

    if (password.length < 6) {
        showError('signupError', 'Password must be at least 6 characters.');
        return;
    }

    setLoading(btn, true, 'Create Account');

    try {
        const res  = await fetch(`${API_URL}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showError('signupError', data || 'Registration failed. Please try again.');
        } else {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showSuccess('signupSuccess', `Account created! Welcome, ${data.user.name}!`);

        setTimeout(() => {
    closeModal();

    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.role === "Doctor") {
        window.location.href = "doctor.html";
    } else {
        window.location.href = "dashboard.html";
    }
}, 1800);
        }
    } catch (err) {
        showError('signupError', 'Cannot connect to server. Make sure your backend is running.');
    } finally {
        setLoading(btn, false, 'Create Account');
    }
});