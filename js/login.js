/**
 * Login Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const btn = loginForm.querySelector('button[type="submit"]');

        if (!phone || !password) {
            WaslaUtils.showToast('Please fill in all fields', 'error');
            return;
        }

        // Simulate Network
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        await WaslaUtils.delay(600);

        const result = WaslaUtils.loginUser(phone, password);

        if (result.success) {
            WaslaUtils.showToast(`Welcome back, ${result.user.name.split(' ')[0]}!`, 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            WaslaUtils.showToast(result.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Login';
        }
    });
});
