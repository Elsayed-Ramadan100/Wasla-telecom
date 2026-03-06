/**
 * Global Header and Navigation Logic
 * Handles Dark Mode, Mobile Hamburger Menu, and Smart Auth Handling
 */
document.addEventListener('DOMContentLoaded', () => {

    const user = WaslaUtils.getCurrentUser();
    const token = WaslaUtils.getToken();

    // If there is no token or user, ensure we are clean
    if (!token && user) {
        WaslaUtils.logoutUser();
    }

    // --- Dark Mode Logic ---
    const themeToggle = document.getElementById('theme-toggle-btn');
    if (themeToggle) {
        const savedTheme = localStorage.getItem(WaslaUtils.STORAGE_KEYS.THEME) || 'light';
        if (savedTheme === 'dark') document.body.classList.add('dark-theme');
        themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            WaslaUtils.toggleTheme();
            const newTheme = document.documentElement.getAttribute('data-theme');
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';

            if (newTheme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        });
    }

    // --- Mobile Hamburger Menu Logic ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const secondaryNav = document.querySelector('.secondary-nav');

    if (mobileMenuBtn && secondaryNav) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            secondaryNav.classList.toggle('active');
        });
    }

    // --- Smart Auth Handling ---
    const userIcon = document.querySelector('.user-icon');
    const userNameWrapper = document.querySelector('.user-name-wrapper');
    const logoutBtn = document.querySelector('.logout-btn');

    if (user && token) {
        // User IS logged in: Format and display name
        const firstName = user.name ? user.name.split(' ')[0] : 'User';
        const prefix = (user.gender && user.gender.toLowerCase() === 'female') ? 'Ms.' : 'Mr.';
        const formattedName = `${prefix} ${firstName}`;

        document.querySelectorAll('.user-name').forEach(el => el.textContent = formattedName);

        // Ensure elements are visible (fallback if hidden by default HTML)
        if (userIcon) userIcon.style.display = 'inline-block';
        if (userNameWrapper) userNameWrapper.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';

        if (secondaryNav) {
            secondaryNav.style.display = ''; // Restore to default display type

            // Sync Gift and Profile icons based on profile completion
            const navGift = document.getElementById('nav-profile-completion');
            const navProfile = document.querySelector('.secondary-nav a[href="profile.html"]');

            if (navGift && navProfile) {
                navProfile.style.display = ''; // Settings should always be visible
                navGift.href = 'claim-gift.html';
                navGift.classList.add('pulse-anim'); // Add animation class

                if (user.profileCompleted) {
                    navGift.style.display = 'none';
                } else {
                    navGift.style.display = '';
                }
            }
        }

    } else {
        // User IS NOT logged in: Hide profile elements and secondary nav immediately
        if (userIcon) userIcon.style.display = 'none';
        if (userNameWrapper) userNameWrapper.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (secondaryNav) secondaryNav.style.display = 'none';

        // Hide hamburger menu since the secondary nav is completely hidden
        if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
    }
});
