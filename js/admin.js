/**
 * Admin Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const users = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.USERS) || [];

    // Stats
    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-rev').textContent = '0 EGP'; // Mock

    // Render User Table
    const tbody = document.getElementById('users-table-body');
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${u.name}</td>
      <td>${u.phone}</td>
      <td>${(u.dataBalanceGB || 0).toFixed(1)} GB</td>
      <td>
        <button class="btn btn-secondary" style="padding:2px 8px; font-size: 0.8em;" onclick="deleteUser('${u.phone}')">Del</button>
      </td>
    `;
        tbody.appendChild(tr);
    });

    window.deleteUser = (phone) => {
        if (confirm('Delete user?')) {
            // logic to delete
            const newUsers = users.filter(u => u.phone !== phone);
            WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.USERS, newUsers);
            location.reload();
        }
    };
});
