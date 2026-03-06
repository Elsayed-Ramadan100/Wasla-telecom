/**
 * Usage Logic with Chart.js & html2pdf
 */
document.addEventListener('DOMContentLoaded', async () => {
    const user = WaslaUtils.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const totalGB = parseFloat(user.dataBalanceGB) || 0;
    // Mock user consumption dynamically based on if they have data
    const usedGB = totalGB > 0 ? Math.min(1.5, totalGB) : 0;
    const unusedGB = totalGB > 0 ? (totalGB - usedGB) : 0;

    // Update DOM UI Grid
    document.getElementById('stat-total-gb').textContent = totalGB.toFixed(1) + ' GB';
    document.getElementById('stat-used-gb').textContent = usedGB.toFixed(1) + ' GB';
    document.getElementById('stat-left-gb').textContent = unusedGB.toFixed(1) + ' GB';
    document.getElementById('center-gb').textContent = unusedGB.toFixed(1);

    const ctx = document.getElementById('usageChart').getContext('2d');

    let chartData = [unusedGB, usedGB];
    // If no data, show a full grey circle
    if (totalGB === 0) chartData = [1, 0];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Available Data', 'Used Data'],
            datasets: [{
                data: chartData,
                backgroundColor: [
                    totalGB === 0 ? '#e0e0e0' : '#6A0DAD', // Purple for Available, Grey if Empty
                    '#FFC107' // Yellow for Used
                ],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { family: 'Inter', size: 13 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (totalGB === 0) return ' No active data plans';
                            return ` ${context.raw.toFixed(1)} GB`;
                        }
                    }
                }
            }
        }
    });

    // Subscriptions Fetching & Table Rendering
    const gridContainer = document.getElementById('subscriptions-grid');

    async function fetchSubscriptions() {
        try {
            const res = await WaslaUtils.apiFetch('/user/subscriptions', { method: 'GET' });
            if (res.success) {
                renderSubscriptionsGrid(res.subscriptions);
                document.getElementById('stat-active-plans').textContent = res.subscriptions.length;
            }
        } catch (error) {
            gridContainer.innerHTML = `<div style="text-align:center; color: red; grid-column: 1 / -1;">Failed to load subscriptions.</div>`;
        }
    }


    function renderSubscriptionsGrid(subscriptions) {
        if (!subscriptions || subscriptions.length === 0) {
            gridContainer.innerHTML = `<div style="text-align:center; color: var(--text-light); grid-column: 1 / -1;">No active plans found.</div>`;
            return;
        }

        gridContainer.innerHTML = subscriptions.map(sub => {
            const date = new Date(sub.date).toLocaleDateString();
            const cost = sub.amount > 0 ? `${sub.amount} EGP` : 'Free';

            let statusBadge = `<span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8em; background: rgba(40,167,69,0.1); color: #28a745;">${sub.status}</span>`;
            if (sub.status === 'Paused') {
                statusBadge = `<span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8em; background: rgba(255,193,7,0.1); color: #ffc107;">Paused</span>`;
            }

            let isGift = sub.type === 'gift';

            // Consume the backend-provided mapped total capacity explicitly
            const dataAmount = sub.totalGB || 0;

            // Since we don't track partial consumption per individual package in the backend yet,
            // visually represent consumption by constraining the package max with the user's current global dataBalanceGB.
            const user = WaslaUtils.getCurrentUser() || { dataBalanceGB: 0 };
            const left = Math.min(dataAmount, parseFloat(user.dataBalanceGB));
            const used = Math.max(0, dataAmount - left);

            let actionBtn = `
                <button class="btn btn-primary btn-cancel-package" style="padding: 6px 12px; font-size: 0.85em; background-color: var(--error); border: none;" data-id="${sub.id}">
                    Cancel Package
                </button>`;

            if (isGift) {
                actionBtn = `
                    <button class="btn btn-secondary btn-gift-toggle" style="padding: 6px 12px; font-size: 0.85em;" data-paused="${sub.isPaused}">
                        ${sub.isPaused ? 'Resume Usage' : 'Pause Usage'}
                    </button>`;
            }

            return `
                <div class="subscription-card ${isGift ? 'gift-card' : ''}">
                    <div class="pkg-header">
                        <div>
                            <div class="pkg-title">${sub.name}</div>
                            <div class="pkg-cost">${cost}</div>
                        </div>
                        <div>${statusBadge}</div>
                    </div>
                    <div class="pkg-stats">
                        <div class="stat-box">
                            <div class="stat-value">${dataAmount}</div>
                            <div class="stat-label">Total GB</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value" style="color: #FFC107;">${used}</div>
                            <div class="stat-label">Used GB</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${left}</div>
                            <div class="stat-label">Left GB</div>
                        </div>
                    </div>
                    <div class="pkg-footer">
                        <span style="font-size: 0.8rem; color: var(--text-light);">Purchased: ${date}</span>
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join('');

        // Attach listeners to gift toggles
        document.querySelectorAll('.btn-gift-toggle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.target;
                const isPaused = target.getAttribute('data-paused') === 'true';

                target.disabled = true;
                target.textContent = 'Updating...';

                try {
                    const updateRes = await WaslaUtils.apiFetch('/user/profile', {
                        method: 'PUT',
                        body: JSON.stringify({ giftPaused: !isPaused })
                    });

                    if (updateRes.success) {
                        WaslaUtils.showToast(`Gift ${!isPaused ? 'Paused' : 'Resumed'}`, 'success');

                        // Wait briefly then reload
                        setTimeout(() => {
                            window.location.reload();
                        }, 800);
                    }
                } catch (err) {
                    target.disabled = false;
                    target.textContent = isPaused ? 'Resume Usage' : 'Pause Usage';
                    WaslaUtils.showToast('Failed to toggle gift state', 'error');
                }
            });
        });

        // -- Modal Logic Integration --
        const cancelModal = document.getElementById('cancel-modal');
        const modalPkgName = document.getElementById('modal-pkg-name');
        const modalPkgGb = document.getElementById('modal-pkg-gb');
        const btnModalClose = document.getElementById('btn-modal-close');
        const btnModalConfirm = document.getElementById('btn-modal-confirm');

        let packageToDeleteId = null;

        // Attach listeners to Cancel buttons (Opens Modal)
        document.querySelectorAll('.btn-cancel-package').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                packageToDeleteId = target.getAttribute('data-id');

                // Traverse the DOM to find the specific package name rendered on this card
                const card = target.closest('.subscription-card');
                const pkgName = card.querySelector('.pkg-title').textContent;

                // Read authoritative GB from the subscription data (sourced from DB record.dataGB)
                const subscriptionData = subscriptions.find(s => String(s.id) === String(packageToDeleteId));
                const capacityToLose = subscriptionData ? subscriptionData.totalGB : 0;

                // Inject dynamic data into the Modal text spans
                modalPkgName.textContent = pkgName;
                modalPkgGb.textContent = capacityToLose;

                // Show Modal
                cancelModal.classList.add('show-modal');
            });
        });

        // Close Modal Handler
        btnModalClose.addEventListener('click', () => {
            cancelModal.classList.remove('show-modal');
            packageToDeleteId = null;
        });

        // Execute Deletion from Modal
        btnModalConfirm.addEventListener('click', async () => {
            if (!packageToDeleteId) return;

            const originalText = btnModalConfirm.textContent;
            btnModalConfirm.disabled = true;
            btnModalConfirm.textContent = 'Canceling...';

            try {
                // Safely execute the exact same DELETE API call
                const res = await WaslaUtils.apiFetch('/user/subscriptions/' + packageToDeleteId, {
                    method: 'DELETE'
                });

                if (res.success) {
                    WaslaUtils.showToast(res.message, 'success');

                    // Force a network pull of the active user profile to fetch subtracted DB changes natively
                    const freshProfile = await WaslaUtils.apiFetch('/user/profile', { method: 'GET' });
                    if (freshProfile && freshProfile.user) {
                        WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, freshProfile.user);
                    }

                    // Reload DOM smoothly
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            } catch (err) {
                cancelModal.classList.remove('show-modal');
                btnModalConfirm.disabled = false;
                btnModalConfirm.textContent = originalText;
                WaslaUtils.showToast(err.message || 'Failed to cancel package', 'error');
            }
        });
    }

    // Initialize Table Fetch
    await fetchSubscriptions();

    // Download PDF Real Implementation
    document.getElementById('btn-download-pdf').addEventListener('click', () => {
        const element = document.getElementById('pdf-content-area');
        const opt = {
            margin: 0.5,
            filename: 'wasla-usage-report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        WaslaUtils.showToast('Preparing PDF...', 'info');
        html2pdf().set(opt).from(element).save().then(() => {
            WaslaUtils.showToast('PDF Exported Successfully!', 'success');
        });
    });
});
