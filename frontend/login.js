

const API_URL = 'http://localhost:5000';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('button');

    // UI Feedback
    btn.innerText = "Authenticating...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // 1. Store the token and user info (name, role, etc.)
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // 2. The "Smart Redirect"
        
         if (data.user.role === 'Admin') {
             window.location.href = 'admin.html';
            } else if (data.user.role === 'Doctor') {
                 window.location.href = 'doctor.html';
                } else {
                     window.location.href = 'dashboard.html';
}
        } else {
            alert(data.message || "Login failed. Please check your credentials.");
            btn.innerText = "Login";
            btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        alert("Server connection failed. Is your backend running on port 5000?");
        btn.innerText = "Login";
        btn.disabled = false;
    }
});
console.log("User role:", data.user.role);