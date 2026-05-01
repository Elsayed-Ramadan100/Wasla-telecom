/**
 * Admin Panel & RBAC Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Authentication & Role Check
    const adminToken = localStorage.getItem('adminToken');
    const rawProfile = localStorage.getItem('adminProfile');

    if (!adminToken || !rawProfile) {
        window.location.href = 'admin-login.html';
        return;
    }

    const adminProfile = JSON.parse(rawProfile);
    const API_BASE = 'http://localhost:3000/api';

    // Auth Headers for all requests
    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
    });

    // Logout handling
    document.getElementById('header-logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminProfile');
        window.location.href = 'admin-login.html';
    });

    // 2. Apply RBAC (Hide/Show elements based on permissions)
    function applyRBAC() {
        // Handle explicit Owner-only elements
        const ownerElements = document.querySelectorAll('[data-role="owner"]');
        ownerElements.forEach(el => {
            if (adminProfile.role !== 'owner') {
                el.style.display = 'none';
            } else {
                el.style.display = el.tagName === 'BUTTON' ? 'inline-block' : 'block';
            }
        });

        // Handle specific granular permissions
        const permElements = document.querySelectorAll('[data-permission]');
        permElements.forEach(el => {
            const reqPerm = el.getAttribute('data-permission');
            // Owners bypass all perm checks, otherwise respect the boolean
            if (adminProfile.role === 'owner' || adminProfile[reqPerm] === true) {
                // leave visible
            } else {
                el.style.display = 'none';
            }
        });

        // Welcome text
        document.querySelector('.user-name-wrapper .user-name').textContent = adminProfile.username;
        document.querySelector('h1 + div p').textContent = `Welcome, ${adminProfile.role === 'owner' ? 'Super Admin' : 'Staff'} (${adminProfile.username})`;
    }

    applyRBAC();

    // 3. TABS LOGIC
    const tabsContainer = document.getElementById('admin-tabs-container');
    const tabs = tabsContainer.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // Utility: Centralized Error Handler
    function handleAPIError(res, data) {
        if (res.status === 401 || res.status === 403) {
            WaslaUtils.showToast(data.message || 'Permission Denied', 'error');
            if (res.status === 401) {
                // Token invalid
                localStorage.removeItem('adminToken');
                setTimeout(() => window.location.href = 'admin-login.html', 2000);
            }
            return true;
        }
        return false;
    }


    // ==========================================
    // MODULE: OFFERS MANAGEMENT (Still using LocalStorage for now per context scope)
    // ==========================================
    // Keeping existing Offers logic intact as requested to focus on RBAC overrides
    let offers = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.OFFERS) || [];
    const offersGrid = document.getElementById('admin-offers-list');
    const offerModal = document.getElementById('modal-offer');
    const offerForm = document.getElementById('offer-form');

    function renderOffersAdmin() {
        offersGrid.innerHTML = '';
        offers.forEach(offer => {
            const div = document.createElement('div');
            div.className = 'card stat-box';
            div.style = 'border-left: 5px solid var(--secondary-color); position:relative;';
            div.innerHTML = `
                <h3>${offer.name}</h3>
                <p><strong>${offer.price} EGP</strong> / ${offer.validityDays || 30} Days</p>
                <p>${offer.data || offer.dataGB + ' GB'}</p>
                <p style="font-size:0.8em; color:#666; margin-top:5px;">${offer.description}</p>
                <div class="flex justify-end gap-10" style="margin-top:15px;">
                    <button class="btn btn-secondary btn-sm" onclick="editOffer('${offer.id}')">Edit</button>
                    <button class="btn btn-primary btn-sm" style="background:red; border-color:red;" onclick="deleteOffer('${offer.id}')">Delete</button>
                </div>
            `;
            offersGrid.appendChild(div);
        });
    }

    document.getElementById('btn-add-offer').addEventListener('click', () => {
        document.getElementById('offer-id').value = '';
        offerForm.reset();
        document.getElementById('modal-offer-title').textContent = 'Add New Offer';
        offerModal.classList.remove('hidden');
    });

    offerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('offer-id').value;
        const newOffer = {
            id: id || 'offer_' + Date.now(),
            name: document.getElementById('offer-name').value,
            price: document.getElementById('offer-price').value,
            data: document.getElementById('offer-data').value,
            validityDays: document.getElementById('offer-days').value,
            description: document.getElementById('offer-desc').value,
            type: 'bundle'
        };

        if (id) {
            const index = offers.findIndex(o => o.id === id);
            if (index > -1) offers[index] = newOffer;
        } else {
            offers.push(newOffer);
        }

        WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.OFFERS, offers);
        renderOffersAdmin();
        offerModal.classList.add('hidden');
        WaslaUtils.showToast('Offer saved successfully!', 'success');
    });

    window.editOffer = (id) => {
        const offer = offers.find(o => o.id === id);
        if (!offer) return;
        document.getElementById('offer-id').value = offer.id;
        document.getElementById('offer-name').value = offer.name;
        document.getElementById('offer-price').value = offer.price;
        document.getElementById('offer-data').value = offer.data || offer.dataGB;
        document.getElementById('offer-days').value = offer.validityDays || 30;
        document.getElementById('offer-desc').value = offer.description;
        document.getElementById('modal-offer-title').textContent = 'Edit Offer';
        offerModal.classList.remove('hidden');
    };

    window.deleteOffer = (id) => {
        if (confirm('Are you sure you want to delete this offer?')) {
            offers = offers.filter(o => o.id !== id);
            WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.OFFERS, offers);
            renderOffersAdmin();
            WaslaUtils.showToast('Offer deleted.', 'success');
        }
    };

    renderOffersAdmin();


    // ==========================================
    // MODULE: STAFF MANAGEMENT (Owner Only)
    // ==========================================
    const staffTableBody = document.getElementById('staff-table-body');
    const staffModal = document.getElementById('modal-staff');
    const staffForm = document.getElementById('staff-form');
    let currentStaffList = [];

    async function loadStaff() {
        if (adminProfile.role !== 'owner') return;
        try {
            const res = await fetch(`${API_BASE}/admin/staff`, { headers: getHeaders() });
            const data = await res.json();
            if (handleAPIError(res, data)) return;

            if (data.success) {
                currentStaffList = data.staff;
                renderStaffTable();
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderStaffTable() {
        staffTableBody.innerHTML = '';
        currentStaffList.forEach(s => {
            const tr = document.createElement('tr');

            // Build permissions badge summary
            let perms = [];
            if (s.canViewUsers) perms.push('View');
            if (s.canEditUsers) perms.push('Edit');
            if (s.canManageBilling) perms.push('Billing');
            if (s.canModerateUsers) perms.push('Mod');
            if (s.canDeleteUsers) perms.push('Wipe');
            if (s.canManageOffers) perms.push('Offers');

            // Prevent removing the owner by adding the disabled attribute
            const disableRemove = s.role === 'owner' ? 'disabled' : '';

            tr.innerHTML = `
                <td><strong>${s.username}</strong></td>
                <td><span style="background:#eee; padding:2px 8px; border-radius:12px; font-size:0.8em;">${s.role}</span></td>
                <td style="font-size:0.85em; color:var(--text-secondary);">${perms.length ? perms.join(', ') : 'None'}</td>
                <td>
                    <div class="flex gap-10">
                        <button class="btn btn-secondary btn-sm" onclick="editStaff('${s.id}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteStaff('${s.id}')" ${disableRemove}>Remove</button>
                    </div>
                </td>
            `;
            staffTableBody.appendChild(tr);
        });
    }

    document.getElementById('btn-add-staff').addEventListener('click', () => {
        document.getElementById('staff-id').value = '';
        staffForm.reset();
        document.getElementById('staff-username').disabled = false;
        document.getElementById('staff-password-group').style.display = 'block';
        document.getElementById('modal-staff-title').textContent = 'Add Staff Member';
        staffModal.classList.remove('hidden');
    });

    staffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('staff-id').value;
        const username = document.getElementById('staff-username').value;
        const password = document.getElementById('staff-password').value;

        const permissions = {
            canViewUsers: document.getElementById('perm-view-users').checked,
            canEditUsers: document.getElementById('perm-edit-users').checked,
            canManageBilling: document.getElementById('perm-manage-billing').checked,
            canModerateUsers: document.getElementById('perm-moderate-users').checked,
            canDeleteUsers: document.getElementById('perm-delete-users').checked,
            canManageOffers: document.getElementById('perm-manage-offers').checked
        };

        try {
            let res, data;
            if (id) {
                // Update (Only permissions for now to keep it simple, skip password/username updating)
                res = await fetch(`${API_BASE}/admin/staff/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ permissions })
                });
            } else {
                // Create
                res = await fetch(`${API_BASE}/admin/staff`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ username, password, permissions })
                });
            }

            data = await res.json();
            if (handleAPIError(res, data)) return;

            if (data.success) {
                WaslaUtils.showToast(id ? 'Permissions updated' : 'Staff created', 'success');
                staffModal.classList.add('hidden');
                loadStaff();
            } else {
                WaslaUtils.showToast(data.message, 'error');
            }
        } catch (err) {
            WaslaUtils.showToast('Network error', 'error');
        }
    });

    window.editStaff = (id) => {
        const s = currentStaffList.find(x => x.id === id);
        if (!s) return;

        document.getElementById('staff-id').value = s.id;
        document.getElementById('staff-username').value = s.username;
        document.getElementById('staff-username').disabled = true; // Lock username editing
        document.getElementById('staff-password-group').style.display = 'none'; // Lock password editing for now

        document.getElementById('perm-view-users').checked = s.canViewUsers;
        document.getElementById('perm-edit-users').checked = s.canEditUsers;
        document.getElementById('perm-manage-billing').checked = s.canManageBilling;
        document.getElementById('perm-moderate-users').checked = s.canModerateUsers;
        document.getElementById('perm-delete-users').checked = s.canDeleteUsers;
        const offerPerm = document.getElementById('perm-manage-offers');
        if (offerPerm) offerPerm.checked = s.canManageOffers || false;

        document.getElementById('modal-staff-title').textContent = 'Edit Permissions';
        staffModal.classList.remove('hidden');
    };

    window.deleteStaff = async (id) => {
        if (!confirm('Permanently remove this staff member?')) return;
        try {
            const res = await fetch(`${API_BASE}/admin/staff/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            const data = await res.json();
            if (handleAPIError(res, data)) return;

            if (data.success) {
                WaslaUtils.showToast('Staff removed', 'success');
                loadStaff();
            }
        } catch (err) {
            WaslaUtils.showToast('Network error', 'error');
        }
    };


    // ==========================================
    // MODULE: GLOBAL USER MANAGEMENT (RBAC API)
    // ==========================================
    const usersTableBody = document.getElementById('users-table-body');
    const userModal = document.getElementById('modal-user');
    const userDetailsContent = document.getElementById('user-details-content');

    // Edit Details Modal
    const editUserModal = document.getElementById('modal-edit-user');
    const editUserForm = document.getElementById('admin-edit-user-form');

    // Purchase Modal
    const purchaseModal = document.getElementById('modal-purchase');
    const purchaseForm = document.getElementById('purchase-behalf-form');
    const purchaseSelect = document.getElementById('purchase-offer-select');

    let currentGlobalUsers = [];
    let currentlyViewingUser = null;

    async function loadUsers() {
        // Only load if they have permission or are owner
        if (adminProfile.role !== 'owner' && !adminProfile.canViewUsers) {
            usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Permission Denied</td></tr>';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
            const data = await res.json();

            if (handleAPIError(res, data)) return;

            if (data.success) {
                currentGlobalUsers = data.users;
                document.getElementById('stat-users').textContent = currentGlobalUsers.length;
                renderUsersTable();
            }
        } catch (err) {
            console.error('Error fetching users', err);
        }
    }

    const userSearchInput = document.getElementById('admin-user-search');
    userSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderUsersTable(currentGlobalUsers);
            return;
        }
        const filtered = currentGlobalUsers.filter(u => u.phone.includes(query));
        renderUsersTable(filtered);
    });

    function renderUsersTable(usersData = currentGlobalUsers) {
        usersTableBody.innerHTML = '';
        usersData.forEach(u => {
            const isBlocked = u.status === 'blocked';
            const statusColor = isBlocked ? 'red' : 'green';
            const statusText = isBlocked ? 'Blocked' : 'Active';

            // Render buttons ONLY if user holds permission (UI fallback check)
            const canMod = adminProfile.role === 'owner' || adminProfile.canModerateUsers;
            const canPurchase = adminProfile.role === 'owner' || adminProfile.canManageBilling;
            const canDelete = adminProfile.role === 'owner' || adminProfile.canDeleteUsers;

            const blockBtnText = isBlocked ? 'Unblock' : 'Block';
            const blockBtnStyle = isBlocked ? 'background:green; border-color:green;' : 'background:darkorange; border-color:darkorange;';

            let buttonsHtml = `<button class="btn btn-secondary btn-sm" onclick="viewUser('${u.id}')">View</button>`;
            if (canPurchase) buttonsHtml += `<button class="btn btn-primary btn-sm" onclick="openPurchaseModal('${u.id}')">Add Pkg</button>`;
            if (canMod) buttonsHtml += `<button class="btn btn-sm" style="${blockBtnStyle} color:white;" onclick="toggleBlockUser('${u.id}', '${u.status}')">${blockBtnText}</button>`;
            if (canDelete) buttonsHtml += `<button class="btn btn-sm btn-outline-danger" onclick="wipeUser('${u.id}')">Remove</button>`;

            const tr = document.createElement('tr');
            if (isBlocked) tr.style.background = '#ffe6e6';

            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.phone}</td>
                <td><span style="color: ${statusColor}; font-weight:bold;">${statusText}</span></td>
                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="flex gap-10">
                        ${buttonsHtml}
                    </div>
                </td>
            `;
            usersTableBody.appendChild(tr);
        });
    }

    // Modal: View Details
    window.viewUser = (id) => {
        const u = currentGlobalUsers.find(user => user.id === id);
        if (!u) return;
        currentlyViewingUser = u;

        // Toggle edit button visibility inside modal based on permission
        const editBtn = document.getElementById('btn-admin-edit-user');
        if (adminProfile.role === 'owner' || adminProfile.canEditUsers) {
            editBtn.style.display = 'inline-block';
        } else {
            editBtn.style.display = 'none';
        }

        let pzHtml = '';
        if (u.personalization) {
            pzHtml = `
            <div style="margin-top:15px; background:#f5faff; padding:10px; border-radius:8px;">
                <h4 style="margin-bottom:5px; font-size:0.9em; border-bottom:1px solid #cce5ff; padding-bottom:3px;">Personalization Data</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; font-size:0.85em; gap:5px;">
                    <div>Contract: ${u.personalization.contractType}</div>
                    <div>Payment: ${u.personalization.paymentMethod}</div>
                    <div>Internet: ${u.personalization.internetService}</div>
                    <div>Avg Consumption: ${u.personalization.avgConsumption}</div>
                </div>
            </div>`;
        }

        userDetailsContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">User Profile</h3>
                <div class="user-info-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:10px;">
                    <div><strong>ID:</strong> <span style="font-size:0.8em; color:#666;">${u.id}</span></div>
                    <div><strong>Name:</strong> ${u.name}</div>
                    <div><strong>Phone:</strong> ${u.phone}</div>
                    <div><strong>Email:</strong> ${u.email || 'N/A'}</div>
                    <div><strong>Region:</strong> ${u.region || 'N/A'}</div>
                    <div><strong>Status:</strong> <span style="font-weight:bold; color:${u.status === 'blocked' ? 'red' : 'green'}">${u.status}</span></div>
                    <div><strong>Balance:</strong> ${u.balance.toFixed(2)} EGP</div>
                    <div><strong>Data:</strong> ${u.dataBalanceGB} GB</div>
                </div>
                ${pzHtml}
            </div>
        `;
        userModal.classList.remove('hidden');
    };

    // Modal: Edit User Bypass Logic
    document.getElementById('btn-admin-edit-user').addEventListener('click', () => {
        if (!currentlyViewingUser) return;
        userModal.classList.add('hidden'); // Close view modal

        document.getElementById('admin-edit-userid').value = currentlyViewingUser.id;
        document.getElementById('admin-edit-name').value = currentlyViewingUser.name;
        document.getElementById('admin-edit-email').value = currentlyViewingUser.email || '';

        // rudimentary split of region string
        const parts = (currentlyViewingUser.region || '').split(',');
        document.getElementById('admin-edit-city').value = parts[0] ? parts[0].trim() : '';
        document.getElementById('admin-edit-state').value = parts[1] ? parts[1].trim() : '';

        editUserModal.classList.remove('hidden');
    });

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-edit-userid').value;
        const payload = {
            name: document.getElementById('admin-edit-name').value,
            email: document.getElementById('admin-edit-email').value,
            city: document.getElementById('admin-edit-city').value,
            state: document.getElementById('admin-edit-state').value
        };

        const passwordInput = document.getElementById('admin-edit-password').value;
        if (passwordInput && passwordInput.trim() !== '') {
            payload.password = passwordInput.trim();
        }

        try {
            const res = await fetch(`${API_BASE}/admin/users/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (handleAPIError(res, data)) return;

            if (data.success) {
                WaslaUtils.showToast('Profile forcefully updated (OTP Bypassed)', 'success');
                editUserModal.classList.add('hidden');
                loadUsers(); // Refresh
            }
        } catch (err) {
            WaslaUtils.showToast('Network error', 'error');
        }
    });

    // Action: Moderate (Block/Unblock)
    window.toggleBlockUser = async (id, currentStatus) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        if (!confirm(`Switch user status to ${newStatus.toUpperCase()}?`)) return;

        try {
            const res = await fetch(`${API_BASE}/admin/users/${id}/status`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            const data = await res.json();
            if (handleAPIError(res, data)) return;

            if (data.success) {
                WaslaUtils.showToast(`User status is now ${newStatus}`, 'success');
                loadUsers();
            }
        } catch (err) {
            WaslaUtils.showToast('Network error', 'error');
        }
    };

    // Action: Wipe User
    window.wipeUser = async (id) => {
        if (!confirm('CRITICAL WARNING: This will permanently wipe the user, all their billing history, tickets, and rewards. Proceed?')) return;

        try {
            const res = await fetch(`${API_BASE}/admin/users/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            const data = await res.json();
            if (handleAPIError(res, data)) return;

            if (data.success) {
                WaslaUtils.showToast('User permanently erased from system.', 'success');
                loadUsers();
            }
        } catch (err) {
            WaslaUtils.showToast('Network error', 'error');
        }
    };

    // Action: Purchase on Behalf Modal
    window.openPurchaseModal = (id) => {
        document.getElementById('purchase-userid').value = id;

        // Populate select list with current static offers
        purchaseSelect.innerHTML = '<option value="" disabled selected>Select Package</option>';
        offers.forEach(o => {
            purchaseSelect.innerHTML += `<option value="${o.id}">${o.name} - ${o.price} EGP</option>`;
        });

        purchaseModal.classList.remove('hidden');
    };

    purchaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('purchase-userid').value;
        const offerId = purchaseSelect.value;
        const submitBtn = purchaseForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Executing...';

        try {
            const res = await fetch(`${API_BASE}/admin/users/${id}/purchase`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ offerId })
            });
            const data = await res.json();

            if (handleAPIError(res, data)) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Purchase';
                return;
            }

            if (data.success) {
                WaslaUtils.showToast(data.message, 'success');
                purchaseModal.classList.add('hidden');
                loadUsers();
            } else {
                WaslaUtils.showToast(data.message, 'error');
            }
        } catch (err) {
            WaslaUtils.showToast('Network error', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Purchase';
        }
    });

    // Close Modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        });
    });

    // Boot actions
    loadStaff();
    loadUsers();
});
