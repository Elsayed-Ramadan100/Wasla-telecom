/**
 * Wasla Telecom - Shared Utilities
 * Handles Mock API, LocalStorage, and common helpers.
 * This file should be included before page-specific scripts.
 */

const WaslaUtils = (function () {
    const STORAGE_KEYS = {
        CURRENT_USER: 'wasla_current_user',
        TOKEN: 'wasla_jwt_token', // Updated to wasla_jwt_token
        OFFERS: 'wasla_offers',
        BILLING: 'wasla_billing',
        TICKETS: 'wasla_tickets',
        THEME: 'wasla_theme'
    };

    const API_BASE_URL = 'http://localhost:3000/api';

    // Mock initial data (Kept for frontend-only components like Offers)
    const MOCK_DATA = {
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
            console.log('Seed: Initializing mock data limit...');
            localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(MOCK_DATA.offers));
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

    function getToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    /**
     * API Fetch Wrapper with Authorization Header
     */
    async function apiFetch(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    }

    function clearUserSession() {
        // Wipe ALL user-specific keys to prevent cross-user data leakage
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.BILLING);
        localStorage.removeItem(STORAGE_KEYS.TICKETS);
    }

    function logoutUser() {
        clearUserSession();
        window.location.href = 'login.html';
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

    function showOtpToast(message, code) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast success`;

        // Structure with a copy button
        toast.innerHTML = `
            <span class="toast-icon">✔️</span> 
            <span class="toast-msg" style="margin-right: 15px;">${message}</span>
            <button class="btn btn-sm btn-primary copy-otp-btn" style="padding: 4px 8px; font-size: 0.8rem;">Copy Code</button>
        `;

        container.appendChild(toast);

        // Add copy functionality
        const copyBtn = toast.querySelector('.copy-otp-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(code).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                copyBtn.style.backgroundColor = '#2ecc71'; // Green for success
                copyBtn.style.borderColor = '#2ecc71';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = '';
                    copyBtn.style.borderColor = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });

        // 15 seconds duration instead of 3
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 15000);
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

    function addBillingRecord(record) {
        let history = getStore(STORAGE_KEYS.BILLING) || [];
        history.unshift(record);
        setStore(STORAGE_KEYS.BILLING, history);
    }

    // --- INITIALIZATION ---
    initStore();

    return {
        STORAGE_KEYS,
        API_BASE_URL,
        delay,
        getStore,
        setStore,
        getCurrentUser,
        getToken,
        apiFetch,
        clearUserSession,
        logoutUser,
        showToast,
        showOtpToast,
        toggleTheme,
        formatCurrency,
        addBillingRecord
    };

})();
