/**
 * Wasla Telecom - Shared Utilities
 * Handles Mock API, LocalStorage, and common helpers.
 * This file should be included before page-specific scripts.
 */

const WaslaUtils = (function () {
    const STORAGE_KEYS = {
        USERS: 'wasla_users',
        CURRENT_USER: 'wasla_current_user',
        OFFERS: 'wasla_offers',
        BILLING: 'wasla_billing',
        TICKETS: 'wasla_tickets',
        THEME: 'wasla_theme'
    };

    // Mock initial data
    const MOCK_DATA = {
        users: [],
        offers: [
            { id: '1', name: 'Super Flex 100', price: 100, data: '20GB', desc: 'Best for streaming', type: 'bundle' },
            { id: '2', name: 'Talk More', price: 50, data: '5GB', desc: 'More minutes', type: 'bundle' },
            { id: '3', name: 'Gamer Pro', price: 150, data: '50GB', desc: 'Low latency', type: 'bundle' }
        ]
    };

    /**
     * --- MOCK STORAGE & API ---
     */

    function initStore() {
        if (!localStorage.getItem(STORAGE_KEYS.OFFERS)) {
            console.log('Seed: Initializing mock data...');
            localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(MOCK_DATA.offers));
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
        }
        // Initialize Theme
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function getStore(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    function setStore(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    /**
     * Simulate network delay
     * @param {number} ms - Milliseconds to delay (default random 200-800)
     */
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms || Math.random() * 600 + 200));

    /**
     * --- AUTH HELPERS ---
     */

    function getCurrentUser() {
        return getStore(STORAGE_KEYS.CURRENT_USER);
    }

    function loginUser(phone, password) {
        const users = getStore(STORAGE_KEYS.USERS) || [];
        // Simple mock auth - in real world, hash password!
        const user = users.find(u => (u.phone === phone || u.email === phone) && u.password === password);
        if (user) {
            setStore(STORAGE_KEYS.CURRENT_USER, user);
            return { success: true, user };
        }
        return { success: false, message: 'Invalid credentials' };
    }

    function logoutUser() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        window.location.href = 'login.html';
    }

    function registerUser(userData) {
        const users = getStore(STORAGE_KEYS.USERS) || [];
        if (users.find(u => u.phone === userData.phone)) {
            throw new Error('Phone number already exists');
        }

        // Add 10GB Gift
        userData.balance = 0;
        userData.dataBalanceGB = 10.0; // The 10GB Gift
        userData.giftExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 days
        userData.id = 'user_' + Date.now();
        userData.joinedDate = new Date().toISOString();

        users.push(userData);
        setStore(STORAGE_KEYS.USERS, users);

        // Auto login
        setStore(STORAGE_KEYS.CURRENT_USER, userData);
        return userData;
    }

    /**
     * --- UI HELPERS ---
     */

    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        // Icon based on type
        const icons = {
            success: '✔️',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span> <span class="toast-msg">${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
    }

    // --- INITIALIZATION ---
    initStore();

    return {
        STORAGE_KEYS,
        delay,
        getStore,
        setStore,
        getCurrentUser,
        loginUser,
        logoutUser,
        registerUser,
        showToast,
        toggleTheme,
        formatCurrency
    };

})();
