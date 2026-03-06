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

    // Initialize UI/UX Upgrades (Canvas Network & Scroll Observer)
    initParallaxHero();
    initScrollReveal();
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

/**
 * ---------------------------------------------------------------------------
 * 3D Parallax Mouse Tracking Engine
 * ---------------------------------------------------------------------------
 */
function initParallaxHero() {
    const heroSection = document.getElementById('hero-section');
    if (!heroSection) return;

    const layers = document.querySelectorAll('.parallax-layer');

    heroSection.addEventListener('mousemove', (e) => {
        // Calculate mouse position relative to center of the viewport
        const xAxis = (window.innerWidth / 2 - e.pageX);
        const yAxis = (window.innerHeight / 2 - e.pageY);

        layers.forEach(layer => {
            const speed = parseFloat(layer.getAttribute('data-speed')) || 0;
            // Move components subtly in opposite directions
            const x = xAxis * speed;
            const y = yAxis * speed;

            // Apply transform dynamically 
            layer.style.transform = `translate(${x}px, ${y}px)`;
        });
    });

    // Reset positions gracefully when mouse leaves the hero wrapper entirely
    heroSection.addEventListener('mouseleave', () => {
        layers.forEach(layer => {
            layer.style.transform = `translate(0px, 0px)`;
            layer.style.transition = 'transform 0.5s ease'; // Smooth snapback
        });
    });

    heroSection.addEventListener('mouseenter', () => {
        layers.forEach(layer => {
            layer.style.transition = ''; // Rely on CSS transition for smooth tracking
        });
    });
}

/**
 * ---------------------------------------------------------------------------
 * Intersection Observer for Scroll Animations
 * ---------------------------------------------------------------------------
 */
function initScrollReveal() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Trigger when 15% of the element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once revealed
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => observer.observe(el));
}
