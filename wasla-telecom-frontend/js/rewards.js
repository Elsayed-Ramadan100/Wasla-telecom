/**
 * Rewards UI & Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = WaslaUtils.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // 1. Render Current Points
    const pointsSpan = document.getElementById('total-points');
    if (pointsSpan) {
        pointsSpan.textContent = user.points || 0;
    }

    // 2. Dynamic Point-to-EGP Calculator
    const inputAmount = document.getElementById('redeem-amount');
    const valueEGP = document.getElementById('redeem-value-egp');

    if (inputAmount && valueEGP) {
        inputAmount.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 0;
            const converted = (val / 100) * 20;
            valueEGP.textContent = converted.toFixed(2);
        });
    }

    // 3. Handle Redemption
    const btnWallet = document.getElementById('btn-redeem-wallet');
    const btnVfcash = document.getElementById('btn-redeem-vfcash');

    async function processRedemption(type) {
        const points = parseInt(inputAmount.value) || 0;
        if (points < 100) {
            WaslaUtils.showToast('Minimum 100 points required to redeem.', 'error');
            return;
        }

        if (points > (user.points || 0)) {
            WaslaUtils.showToast('You do not have enough points.', 'error');
            return;
        }

        const btn = type === 'wallet' ? btnWallet : btnVfcash;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const response = await WaslaUtils.apiFetch('/user/redeem-points', {
                method: 'POST',
                body: JSON.stringify({
                    pointsToRedeem: points,
                    type: type // 'wallet' or 'vf-cash'
                })
            });

            // Success Update Session State
            WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, response.user);

            // UI Update
            pointsSpan.textContent = response.user.points || 0;
            inputAmount.value = '';
            valueEGP.textContent = '0';

            WaslaUtils.showToast(response.message, 'success');

        } catch (error) {
            WaslaUtils.showToast(error.message || 'Error processing redemption', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    if (btnWallet) {
        btnWallet.addEventListener('click', () => processRedemption('wallet'));
    }

    if (btnVfcash) {
        btnVfcash.addEventListener('click', () => processRedemption('vf-cash'));
    }
});
