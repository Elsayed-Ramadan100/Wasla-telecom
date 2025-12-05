/**
 * Dashboard Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = WaslaUtils.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Update UI with User Data
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user.name);

    // Usage Stats
    const dataTotal = user.dataBalanceGB || 0;
    // Simulate some usage for the demo
    const dataUsed = user.dataUsed || 0;
    const percent = dataTotal > 0 ? (dataUsed / dataTotal) * 100 : 0;

    document.getElementById('data-total').textContent = `${dataTotal} GB`;
    document.getElementById('data-remaining').textContent = `${(dataTotal - dataUsed).toFixed(1)} GB`;
    document.querySelector('.progress-fill').style.width = `${percent}%`;

    // Balance
    document.getElementById('main-balance').textContent = WaslaUtils.formatCurrency(user.balance || 0);

    // Invite Modal Logic
    const inviteBtn = document.getElementById('btn-invite');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showInviteModal(user);
        });
    }
});

function showInviteModal(user) {
    // Simple check if modal already exists
    let modal = document.getElementById('invite-modal');
    if (!modal) {
        // Create Modal Dynamic
        const modalHTML = `
      <div id="invite-modal" class="modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999;">
        <div class="card" style="width:90%;max-width:500px;position:relative;">
          <button onclick="this.closest('.modal-overlay').remove()" style="position:absolute;top:10px;right:15px;background:none;border:none;font-size:1.5rem;">&times;</button>
          <h2 style="color:var(--primary-color);margin-bottom:15px;">Invite Friends</h2>
          <p>Share your code and get 500MB free for each friend!</p>
          
          <div style="margin:20px 0;padding:15px;background:var(--secondary-color);border-radius:var(--radius-md);text-align:center;font-weight:bold;font-size:1.2rem;letter-spacing:1px;border:2px dashed var(--primary-color);">
            WASLA-${user.id.substr(-6).toUpperCase()}
          </div>
          
          <div class="flex" style="gap:10px;">
            <button class="btn btn-primary" style="flex:1" onclick="WaslaUtils.showToast('Link Copied!', 'success'); this.closest('.modal-overlay').remove();">Copy Link</button>
            <button class="btn btn-secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}
