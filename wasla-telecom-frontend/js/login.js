/**
 * Login Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const btn = loginForm.querySelector('button[type="submit"]');

            if (!phone || !password) {
                WaslaUtils.showToast('Please fill in all fields', 'error');
                return;
            }

            // Admin Login Check
            if (phone === 'admin' && password === 'Admin@123') {
                btn.disabled = true;
                btn.textContent = 'Verifying...';
                await WaslaUtils.delay(600);

                WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, {
                    name: 'Administrator',
                    role: 'admin',
                    phone: 'admin',
                    email: 'admin@wasla.com'
                });

                WaslaUtils.showToast('Welcome Administrator!', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
                return;
            }

            try {
                // Simulate Network / Loading
                btn.disabled = true;
                btn.textContent = 'Verifying...';

                // Real API Call
                const result = await WaslaUtils.apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ phone, password })
                });

                if (result.user.status === 'blocked') {
                    WaslaUtils.showToast('Your account has been blocked by admin.', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Login';
                    return;
                }

                // Wipe any previous session before establishing new one (prevents cross-user leak)
                WaslaUtils.clearUserSession();
                // Save Token and Session securely
                localStorage.setItem(WaslaUtils.STORAGE_KEYS.TOKEN, result.token);
                WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, result.user);

                WaslaUtils.showToast(`Welcome back, ${result.user.name.split(' ')[0]}!`, 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                WaslaUtils.showToast(error.message || 'Invalid credentials', 'error');
                btn.disabled = false;
                btn.textContent = 'Login';
            }
        });
    }

    // --- FORGOT PASSWORD LOGIC ---
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const phone = document.getElementById('phone').value;
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const btn = forgotForm.querySelector('button[type="submit"]');

            if (!phone || !newPass || !confirmPass) {
                WaslaUtils.showToast('Please fill all fields', 'error');
                return;
            }

            if (newPass !== confirmPass) {
                WaslaUtils.showToast('Passwords do not match', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Resetting...';

            try {
                // Simulate call to real backend API (e.g. POST /api/auth/reset-password)
                // Note: since our backend does not have this endpoint yet, we just mock the success locally
                // but without messing with localStorage users array.
                await WaslaUtils.delay(1000);

                WaslaUtils.showToast('Password reset successfully (simulated)!', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);

            } catch (error) {
                WaslaUtils.showToast('User not found with this phone number', 'error');
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        });
    }
});
