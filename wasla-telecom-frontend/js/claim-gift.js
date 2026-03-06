/**
 * Claim Gift Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = WaslaUtils.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Redirect to dashboard if they already completed their profile
    if (user.profileCompleted) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Logic extracted to js/header.js (User Name, Dark Mode, Mobile Menu)

    const form = document.getElementById('personalization-form');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnSubmit = document.getElementById('btn-submit-personalization');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Processing...';

            await WaslaUtils.delay(1000);

            try {
                // Collect Data
                const formData = getFormData('personalization-form');

                // Send to backend
                const response = await WaslaUtils.apiFetch('/user/claim-gift', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });

                // Update Local Session with the returned updated user
                WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, response.user);

                // Notify & Redirect
                WaslaUtils.showToast(response.message || 'Profile Completed! 10GB Claimed.', 'success');

                // Short delay to let the toast show briefly
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);

            } catch (error) {
                WaslaUtils.showToast(error.message || 'Error claiming gift. Please try again.', 'error');
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Submit & Claim 10GB';
            }

            // Short delay to let the toast show briefly
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        });
    }
});

function getFormData(formId) {
    const container = document.getElementById(formId);
    const data = {};

    // Inputs & Selects
    const inputs = container.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select');
    inputs.forEach(input => {
        if (input.id) data[input.id] = input.value;
    });

    // Radios
    const radioNames = new Set();
    container.querySelectorAll('input[type="radio"]').forEach(r => radioNames.add(r.name));
    radioNames.forEach(name => {
        const checked = container.querySelector(`input[name="${name}"]:checked`);
        data[name] = checked ? checked.value : null;
    });

    // Checkboxes (Groups with same name)
    const checkboxNames = new Set();
    container.querySelectorAll('input[type="checkbox"][name]').forEach(c => checkboxNames.add(c.name));
    checkboxNames.forEach(name => {
        const checked = Array.from(container.querySelectorAll(`input[name="${name}"]:checked`)).map(c => c.value);
        data[name] = checked;
    });

    // Single Checkboxes (IDs)
    container.querySelectorAll('input[type="checkbox"][id]:not([name])').forEach(c => {
        data[c.id] = c.checked;
    });

    return data;
}

// Removed legacy updateUser function
