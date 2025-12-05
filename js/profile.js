/**
 * Profile Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = WaslaUtils.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Populate Forms
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    // Show Gift status
    const giftStatus = user.giftPaused ? 'Paused' : 'Active';
    document.getElementById('gift-status').textContent = giftStatus;
    document.getElementById('btn-gift-toggle').textContent = user.giftPaused ? 'Resume Usage' : 'Pause Usage';

    // Save Profile Handlers
    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        user.name = document.getElementById('name').value;
        user.email = document.getElementById('email').value;

        updateUser(user);
        WaslaUtils.showToast('Profile Updated Successfully', 'success');
    });

    // Toggle Gift Logic
    document.getElementById('btn-gift-toggle').addEventListener('click', () => {
        user.giftPaused = !user.giftPaused;
        updateUser(user);

        // UI Update
        document.getElementById('gift-status').textContent = user.giftPaused ? 'Paused' : 'Active';
        document.getElementById('btn-gift-toggle').textContent = user.giftPaused ? 'Resume Usage' : 'Pause Usage';
        WaslaUtils.showToast(`Gift usage ${user.giftPaused ? 'paused' : 'resumed'}`, 'info');
    });

    // Delete Account
    document.getElementById('btn-delete-account').addEventListener('click', () => {
        const confirmation = prompt('Type "DELETE" to confirm account deletion. This cannot be undone.');
        if (confirmation === 'DELETE') {
            // Remove from users list
            const users = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.USERS).filter(u => u.phone !== user.phone);
            WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.USERS, users);
            WaslaUtils.logoutUser();
        }
    });

    function updateUser(updatedUser) {
        const users = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.USERS);
        const idx = users.findIndex(u => u.phone === updatedUser.phone);
        if (idx !== -1) users[idx] = updatedUser;

        WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.USERS, users);
        WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, updatedUser);
    }
});
