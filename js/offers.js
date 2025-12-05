/**
 * Offers Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const offersGrid = document.getElementById('offers-grid');
    const offersData = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.OFFERS) || [];

    renderOffers(offersData);

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            if (filter === 'all') {
                renderOffers(offersData);
            } else {
                const filtered = offersData.filter(o => o.type === filter);
                renderOffers(filtered);
            }
        });
    });

    function renderOffers(offers) {
        offersGrid.innerHTML = '';
        offers.forEach(offer => {
            const card = document.createElement('div');
            card.className = 'card offer-card';
            card.innerHTML = `
        <div class="offer-header">
          <h3>${offer.name}</h3>
          <div class="offer-price">${offer.price} EGP</div>
          <div class="offer-period">Per ${offer.validityDays || 30} Days</div>
        </div>
        <ul class="offer-features">
          <li>DATA: <strong>${offer.data || offer.dataGB + ' GB'}</strong></li>
          <li>DESC: ${offer.description || 'Great value bundle'}</li>
        </ul>
        <button class="btn btn-primary btn-subscribe" data-id="${offer.id}">Subscribe</button>
      `;
            offersGrid.appendChild(card);
        });

        // Attach Event Listeners to new buttons
        document.querySelectorAll('.btn-subscribe').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const offerId = e.target.getAttribute('data-id');
                const offer = offersData.find(o => o.id === offerId);
                confirmSubscription(offer);
            });
        });
    }

    function confirmSubscription(offer) {
        // Show Modal (Simple Confirm)
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999;`;

        overlay.innerHTML = `
      <div class="card" style="width:90%;max-width:400px;text-align:center;">
        <h2>Confirm Subscription</h2>
        <p>You are about to subscribe to <strong>${offer.name}</strong> for <strong>${offer.price} EGP</strong>.</p>
        <div class="flex" style="gap:10px; margin-top:20px;">
          <button id="btn-cancel" class="btn btn-secondary" style="flex:1">Cancel</button>
          <button id="btn-proceed" class="btn btn-primary" style="flex:1">Proceed to Pay</button>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        document.getElementById('btn-cancel').addEventListener('click', () => overlay.remove());
        document.getElementById('btn-proceed').addEventListener('click', () => {
            // Pass offer details via URL params or session storage to payment page
            sessionStorage.setItem('wasla_pending_payment', JSON.stringify({
                type: 'subscription',
                offerId: offer.id,
                amount: offer.price,
                description: `Subscription: ${offer.name}`
            }));
            window.location.href = 'payment.html';
        });
    }
});
