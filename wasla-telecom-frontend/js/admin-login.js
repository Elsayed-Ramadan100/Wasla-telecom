document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('adminLoginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('adminLoginError');

    // Make sure we connect to actual backend now
    const API_BASE_URL = 'http://localhost:3000/api';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        errorDiv.style.display = 'none';

        const originalBtnText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        loginBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store Admin Token and Matrix Payload Profile securely in LocalStorage separate from standard User tokens
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminProfile', JSON.stringify(data.admin));

                loginBtn.style.backgroundColor = 'var(--success-color)';
                loginBtn.innerHTML = '<i class="fas fa-check"></i> Access Granted';

                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 800);
            } else {
                showError(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Admin Login Error:', error);
            showError('Unable to connect to server. Please ensure backend is running.');
        } finally {
            if (loginBtn.disabled && loginBtn.style.backgroundColor !== 'var(--success-color)') {
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
            }
        }
    });

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        loginBtn.disabled = false;
    }
});
