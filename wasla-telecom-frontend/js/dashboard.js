/**
 * Dashboard Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  const user = WaslaUtils.getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Logic extracted to js/header.js (User Name, Dark Mode, Mobile Menu)

  // Initial Dashboard Render
  refreshDashboardUI(user);
  renderNotifications(user);

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

function updateUser(updatedUser) {
  const users = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.USERS) || [];
  const idx = users.findIndex(u => u.phone === updatedUser.phone);
  if (idx !== -1) {
    users[idx] = updatedUser;
    WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.USERS, users);
  }
  WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, updatedUser);
}

function refreshDashboardUI(user) {
  const dataTotal = user.dataBalanceGB || 0;
  const dataUsed = user.dataUsed || 0;
  const percent = dataTotal > 0 ? (dataUsed / dataTotal) * 100 : 0;

  document.getElementById('data-total').textContent = `${dataTotal} GB`;
  document.getElementById('data-remaining').textContent = `${(dataTotal - dataUsed).toFixed(1)} GB`;
  document.querySelector('.progress-fill').style.width = `${percent}%`;
}

function renderNotifications(user) {
  const container = document.getElementById('notification-container');
  if (!container) return;

  if (user.profileCompleted) {
    container.innerHTML = `
            <div class="notif-item unread">
                <div style="background:var(--primary-color); color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;">🎁</div>
                <div>
                    <p style="font-weight: 600;">Welcome Gift Activated!</p>
                    <p style="font-size: 0.9em; color: var(--text-light);">You received 10GB free data valid for 30 days.</p>
                </div>
            </div>
        `;
  } else {
    container.innerHTML = `
            <div class="notif-item unread" style="display:flex; flex-direction:column; gap:10px; align-items:flex-start;">
                <div>
                    <p style="font-weight: 600;">Welcome to Wasla!</p>
                    <p style="font-size: 0.9em; color: var(--text-light);">Your 10GB Welcome Gift is pending.</p>
                </div>
                <button id="btn-complete-profile" class="btn btn-primary btn-pulse" style="width:100%; font-weight:bold;">Complete Profile to Claim 10GB</button>
            </div>
        `;

    document.getElementById('btn-complete-profile').addEventListener('click', () => {
      window.location.href = 'claim-gift.html';
    });
  }
}

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
