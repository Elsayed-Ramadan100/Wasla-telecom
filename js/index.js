/**
 * Home Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const user = WaslaUtils.getCurrentUser();
    updateNavState(user);

    // Theme Toggle Listener
    const themeToggleInfo = document.getElementById('theme-toggle');
    if (themeToggleInfo) {
        themeToggleInfo.addEventListener('click', (e) => {
            e.preventDefault();
            WaslaUtils.toggleTheme();
        });
    }
});

function updateNavState(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');

    if (user) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('display-name').textContent = user.name || 'User';

        // Logout Handler
        document.getElementById('btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            WaslaUtils.logoutUser();
        });
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}
