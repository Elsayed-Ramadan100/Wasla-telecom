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

    function processPaymentSuccess(amount) {
        amount = parseFloat(amount);

        // Update User Balance
        user.balance = (user.balance || 0) + amount; // If recharge, add to balance
        // If it was a direct subscription payment, we might deduct immediately, 
        // but for simplicity let's say "Recharge then Buy" model or just Direct Buy.
        // Let's assume this flow ADDS balance, and if there was a pending offer, we deduct it now.

        if (pendingPayment) {
            user.balance -= amount; // Deduct for the offer
            // Add Offer logic would go here (add to user.activePlans)
            WaslaUtils.showToast(`Subscribed to ${pendingPayment.description} successfully!`, 'success');
            sessionStorage.removeItem('wasla_pending_payment');
        } else {
            WaslaUtils.showToast(`Recharge of ${amount} EGP Successful!`, 'success');
        }

        // Save User
        const allUsers = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.USERS);
        const idx = allUsers.findIndex(u => u.phone === user.phone);
        if (idx !== -1) allUsers[idx] = user;
        WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.USERS, allUsers);
        WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, user);

        // Add to History
        addBillingRecord({
            date: new Date().toISOString(),
            amount: amount,
            type: pendingPayment ? 'Subscription' : 'Recharge',
            status: 'Success'
        });

        // Reset UI
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }

    function addBillingRecord(record) {
        let history = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.BILLING) || [];
        history.unshift(record);
        WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.BILLING, history);
    }

    // Load History
    loadHistory();

    function loadHistory() {
        const history = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.BILLING) || [];
        const tbody = document.getElementById('billing-table-body');
        if (tbody) {
            tbody.innerHTML = history.map(row => `
        <tr>
          <td>${new Date(row.date).toLocaleDateString()}</td>
          <td>${row.type}</td>
          <td>${WaslaUtils.formatCurrency(row.amount)}</td>
          <td><span style="color:var(--success)">${row.status}</span></td>
        </tr>
      `).join('');
        }
    }
});
