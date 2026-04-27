// This ensures it works locally AND on the live site
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://afyaconnect-backend.onrender.com';

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
document.getElementById('showSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearMessages();
    loginView.style.display  = 'none';
    signupView.style.display = 'block';
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
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
        el.className = 'error-message';
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
// PASSWORD STRENGTH METER (NEW)
// ===========================
function checkPasswordStrength(pw) {
    const hasLength = pw.length >= 8;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw);

    // Update requirement indicators
    const reqElements = {
        reqLength: hasLength,
        reqUpper: hasUpper,
        reqLower: hasLower,
        reqNumber: hasNumber,
        reqSpecial: hasSpecial
    };

    for (const [id, isValid] of Object.entries(reqElements)) {
        const el = document.getElementById(id);
        if (el) {
            if (isValid) {
                el.innerHTML = el.innerHTML.replace('✗', '✓');
                el.style.color = '#059669';
            } else {
                el.innerHTML = el.innerHTML.replace('✓', '✗');
                el.style.color = '#9ca3af';
            }
        }
    }

    let score = 0;
    if (hasLength) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    let strength = '';
    let width = '0%';
    let color = '#f97316';
    
    if (score <= 2) { strength = 'Very weak'; width = '20%'; color = '#f97316'; }
    else if (score === 3) { strength = 'Weak'; width = '40%;'; color = '#eab308'; }
    else if (score === 4) { strength = 'Strong'; width = '80%'; color = '#10b981'; }
    else if (score === 5) { strength = 'Very strong'; width = '100%'; color = '#059669'; }

    const strengthText = document.getElementById('strengthText');
    const strengthFill = document.getElementById('strengthFill');
    
    if (strengthText) strengthText.innerText = strength;
    if (strengthFill) {
        strengthFill.style.width = width;
        strengthFill.style.backgroundColor = color;
    }
    
    return score >= 4;
}

function validatePasswordMatch() {
    const password = document.getElementById('regPass')?.value || '';
    const confirm = document.getElementById('regConfirmPass')?.value || '';
    const matchError = document.getElementById('matchError');
    
    if (confirm && password !== confirm) {
        if (matchError) matchError.innerText = '❌ Passwords do not match';
        return false;
    } else {
        if (matchError) matchError.innerText = '';
        return true;
    }
}

// ===========================
// FORGOT PASSWORD HANDLER (NEW)
// ===========================
document.getElementById('forgotPasswordLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = prompt("🔒 Forgot your password?\n\nEnter your registered email address to receive a secure reset link:");
    
    if (!email) return;
    
    if (!email.includes('@') || !email.includes('.')) {
        alert("❌ Please enter a valid email address.");
        return;
    }
    
    // Show loading state
    const forgotLink = e.target;
    const originalText = forgotLink.textContent;
    forgotLink.textContent = "Sending...";
    forgotLink.style.opacity = "0.6";
    
    try {
        const response = await fetch(`${API_URL}/api/users/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ Password reset link sent to ${email}\n\nThe link will expire in 15 minutes. Please check your inbox.`);
        } else {
            alert(`❌ ${data.error || data.message || 'Email not found. Please check and try again.'}`);
        }
    } catch (err) {
        alert("⚠️ Unable to connect to server. Please try again later.");
        console.error("Forgot password error:", err);
    } finally {
        forgotLink.textContent = originalText;
        forgotLink.style.opacity = "1";
    }
});

// ===========================
// LOGIN FORM
// ===========================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
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
        console.error(err);
    } finally {
        setLoading(btn, false, 'Login');
    }
});

// ===========================
// SIGNUP FORM (ENHANCED with Strong Password)
// ===========================
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    // Standard Fields
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;
    const role     = document.getElementById('regRole').value;
    
    // Doctor Specific Fields
    const license_number = document.getElementById('regLicense')?.value.trim() || '';
    const specialization = document.getElementById('regSpecialization')?.value || '';

    const btn = e.target.querySelector('button[type="submit"]');

    // ========== STRONG PASSWORD VALIDATION ==========
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        showError('signupError', '🔐 Weak password! Must have: 8+ chars, uppercase, lowercase, number, and special character (!@#$%^&*)');
        return;
    }
    
    // Check password match
    const confirmPass = document.getElementById('regConfirmPass').value;
    if (password !== confirmPass) {
        showError('signupError', '❌ Passwords do not match.');
        return;
    }
    // ================================================
    
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
            body: JSON.stringify({ 
                name, email, phone, password, role, 
                license_number, specialization 
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showError('signupError', data.error || 'Registration failed. Please try again.');
        } else {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            const welcomeMsg = data.user.role === 'Doctor' 
                ? `✅ Account created! Pending Admin approval. Strong password saved securely.` 
                : `✅ Account created! Welcome, ${data.user.name}! Your strong password is active.`;

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
        console.error(err);
    } finally {
        setLoading(btn, false, 'Create Account');
    }
});

// Initialize password strength listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const regPass = document.getElementById('regPass');
    const regConfirm = document.getElementById('regConfirmPass');
    
    if (regPass) {
        regPass.addEventListener('input', function() {
            checkPasswordStrength(this.value);
            validatePasswordMatch();
        });
    }
    
    if (regConfirm) {
        regConfirm.addEventListener('input', validatePasswordMatch);
    }
});

// Make toggleDoctorFields available globally
window.toggleDoctorFields = toggleDoctorFields;