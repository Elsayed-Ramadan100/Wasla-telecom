/**
 * Payment Logic (Vodafone Cash Simulation)
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = WaslaUtils.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Check for pending payment from Offers page
    let pendingPayment = sessionStorage.getItem('wasla_pending_payment');
    if (pendingPayment) {
        pendingPayment = JSON.parse(pendingPayment);
        console.log('Pending Payment:', pendingPayment);
        document.getElementById('amount').value = pendingPayment.amount;
        document.getElementById('amount').readOnly = true;
        document.getElementById('payment-title').textContent = pendingPayment.description;
    }

    // Setup UI
    const btnPay = document.getElementById('btn-pay');
    const vfPhone = document.getElementById('vf-phone');
    const step1 = document.getElementById('pay-step-1');
    const step2 = document.getElementById('pay-step-2');

    // Step 1: Input
    btnPay.addEventListener('click', async (e) => {
        e.preventDefault();
        const phoneVal = vfPhone.value;
        const amountVal = document.getElementById('amount').value;

        if (!/^01[0-9]{9}$/.test(phoneVal)) {
            WaslaUtils.showToast('Invalid Vodafone Cash Number', 'error');
            return;
        }

        if (!amountVal || amountVal <= 0) {
            WaslaUtils.showToast('Invalid Amount', 'error');
            return;
        }

        // Move to Step 2 (OTP/Pin Simulation)
        step1.style.display = 'none';
        step2.style.display = 'block';
    });

    // Step 2: Confirm & Simulate
    document.getElementById('btn-confirm-pay').addEventListener('click', async (e) => {
        e.preventDefault();
        const pin = document.getElementById('vf-pin').value;

        if (pin.length < 4) {
            WaslaUtils.showToast('Invalid PIN', 'error');
            return;
        }

        const confirmBtn = e.target;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';

        await WaslaUtils.delay(1500); // Payment processing delay

        // Success Logic
        processPaymentSuccess(pendingPayment ? pendingPayment.amount : document.getElementById('amount').value);
    });

    async function processPaymentSuccess(amount) {
        amount = parseFloat(amount);

        const btn = document.getElementById('btn-confirm-pay');

        try {
            // Real API Call
            const payload = {
                amount: pendingPayment ? amount : amount,
                type: pendingPayment ? 'Subscription' : 'Recharge',
                description: pendingPayment ? pendingPayment.description : 'Vodafone Cash Recharge'
            };

            const response = await WaslaUtils.apiFetch('/user/recharge', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            // Update Current User in Local Session from DB response
            WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, response.user);

            if (pendingPayment) {
                WaslaUtils.showToast(`Subscribed to ${pendingPayment.description} successfully!`, 'success');
                sessionStorage.removeItem('wasla_pending_payment');
            } else {
                WaslaUtils.showToast(`Recharge of ${amount} EGP Successful!`, 'success');
            }

            // Reload billing history from server (no localStorage writes — prevents cross-user leak)
            await loadHistory();

            // Reset UI and Redirect
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (error) {
            WaslaUtils.showToast(error.message || 'Payment processing failed', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Confirm & Pay';
            }
        }
    }

    // Load Billing History from authenticated API (user-scoped, prevents cross-user leak)
    async function loadHistory() {
        try {
            const res = await WaslaUtils.apiFetch('/user/billing-history', { method: 'GET' });
            if (res.success) renderHistoryTable(res.history);
        } catch (e) {
            console.error('Failed to load billing history:', e);
        }
    }

    function renderHistoryTable(history) {
        const tbody = document.getElementById('billing-table-body');
        if (!tbody) return;
        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-light);">No transactions yet.</td></tr>';
            return;
        }
        tbody.innerHTML = history.map(row => {
            const badgeClass = row.status && row.status.toLowerCase() === 'success'
                ? 'status-success'
                : 'status-pending';
            const isDebit = parseFloat(row.amount) < 0;
            const amountColor = isDebit ? '#e60000' : 'var(--text-main)';
            const displayType = row.description || row.type;
            return `
        <tr>
          <td>${new Date(row.date).toLocaleDateString()}</td>
          <td style="font-weight: 500;">${displayType}</td>
          <td style="font-weight: 600; color: ${amountColor};">${WaslaUtils.formatCurrency(row.amount)}</td>
          <td><span class="status-badge ${badgeClass}">${row.status || 'Success'}</span></td>
        </tr>
      `;
        }).join('');
    }

    // Initial load on page entry
    loadHistory();
});
