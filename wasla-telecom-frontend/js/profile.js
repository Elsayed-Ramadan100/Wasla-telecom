/**
 * Profile Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const user = WaslaUtils.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Populate Forms
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';

    // Save Profile Handlers
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.querySelector('#profile-form button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const updatedUser = {
            ...user,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value
        };

        const success = await updateUser(updatedUser);
        if (success) {
            WaslaUtils.showToast('Profile Updated Successfully', 'success');
            // update local ref
            user.name = updatedUser.name;
            user.email = updatedUser.email;
        }

        btn.textContent = originalText;
        btn.disabled = false;
    });


    // Modals & Forms
    const deleteModal = document.getElementById('delete-modal');
    const phoneModal = document.getElementById('phone-modal');

    // === ACCOUNT DELETION LOGIC ===
    const btnDelete = document.getElementById('btn-delete-account');
    const deleteForm = document.getElementById('delete-form');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');

    btnDelete.addEventListener('click', () => {
        deleteModal.classList.remove('hidden');
    });

    btnCancelDelete.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        deleteForm.reset();
    });

    deleteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Get Reason Radio
        const reasonRadio = document.querySelector('input[name="deleteReason"]:checked');
        if (!reasonRadio) {
            WaslaUtils.showToast('Please select a reason for deletion', 'error');
            return;
        }

        // 2. Get Reason Text
        const reasonText = document.getElementById('delete-reason-text').value.trim();
        if (!reasonText) {
            WaslaUtils.showToast('Please describe your reason', 'error');
            return;
        }

        const confirmation = confirm('Are you absolutely sure you want to delete your account? This cannot be undone.');
        if (confirmation) {
            const btn = document.querySelector('#delete-form button[type="submit"]');
            const origText = btn.textContent;
            btn.textContent = 'Deleting...';
            btn.disabled = true;

            try {
                // DELETE ACCOUNT via API
                await WaslaUtils.apiFetch('/user/profile', {
                    method: 'DELETE'
                });

                // Clear storage and kick to login
                WaslaUtils.logoutUser();

            } catch (err) {
                WaslaUtils.showToast(err.message || 'Error deleting account', 'error');
                btn.textContent = origText;
                btn.disabled = false;
            }
        }
    });


    // === PHONE CHANGE LOGIC (Double OTP) ===
    const btnChangePhone = document.getElementById('btn-change-phone');
    const btnClosePhone = document.querySelectorAll('.btn-close-phone');

    // Steps
    const phoneStep1 = document.getElementById('phone-step-1');
    const phoneStep2 = document.getElementById('phone-step-2');
    const phoneStep3 = document.getElementById('phone-step-3');

    let newPhoneNumber = '';

    btnChangePhone.addEventListener('click', () => {
        resetPhoneModal();
        phoneModal.classList.remove('hidden');
    });

    btnClosePhone.forEach(btn => {
        btn.addEventListener('click', () => {
            phoneModal.classList.add('hidden');
        });
    });

    function resetPhoneModal() {
        phoneStep1.classList.remove('hidden');
        phoneStep1.style.opacity = '1';
        phoneStep2.classList.add('hidden');
        phoneStep2.style.opacity = '0';
        phoneStep3.classList.add('hidden');
        phoneStep3.style.opacity = '0';

        document.getElementById('new-phone-input').value = '';
        document.getElementById('otp-old').value = '';
        document.getElementById('otp-new').value = '';
        newPhoneNumber = '';
    }

    function switchSteps(hideStep, showStep) {
        hideStep.style.opacity = '0';
        setTimeout(() => {
            hideStep.classList.add('hidden');
            showStep.classList.remove('hidden');
            showStep.style.opacity = '0';
            setTimeout(() => {
                showStep.style.opacity = '1';
            }, 50);
        }, 300);
    }

    // Step 1: Request Change -> Send OTP to Old
    document.getElementById('btn-phone-next-1').addEventListener('click', async () => {
        const input = document.getElementById('new-phone-input').value;
        if (!/^01[0125][0-9]{8}$/.test(input)) {
            WaslaUtils.showToast('Invalid Egyptian phone number', 'error');
            return;
        }
        if (input === user.phone) {
            WaslaUtils.showToast('You entered your current number', 'error');
            return;
        }

        newPhoneNumber = input;

        // Simulate Sending OTP to OLD number
        // Mocking backend call
        const btn = document.getElementById('btn-phone-next-1');
        btn.textContent = 'Sending OTP...';
        btn.disabled = true;

        await WaslaUtils.delay(1000);

        const code = '111111'; // Mock Code
        sessionStorage.setItem('otp_old_phone', code);
        WaslaUtils.showOtpToast(`OTP sent to ${user.phone}: ${code}`, code);

        const maskedOld = user.phone ? user.phone.slice(0, 3) + '******' + user.phone.slice(-2) : '010******00';
        document.getElementById('lbl-old-phone').textContent = maskedOld;

        switchSteps(phoneStep1, phoneStep2);

        btn.textContent = 'Next';
        btn.disabled = false;
    });

    // Step 2: Verify Old OTP -> Send OTP to New
    document.getElementById('btn-phone-verify-old').addEventListener('click', async () => {
        const enteredOtp = document.getElementById('otp-old').value;
        const correctOtp = sessionStorage.getItem('otp_old_phone');

        if (enteredOtp !== correctOtp) {
            WaslaUtils.showToast('Invalid OTP', 'error');
            return;
        }

        // Success Old -> Send to New
        const btn = document.getElementById('btn-phone-verify-old');
        btn.textContent = 'Verifying...';
        btn.disabled = true;

        await WaslaUtils.delay(1000); // Simulate check

        const codeNew = '222222'; // Mock Code
        sessionStorage.setItem('otp_new_phone', codeNew);
        WaslaUtils.showOtpToast(`OTP sent to ${newPhoneNumber}: ${codeNew}`, codeNew);

        const maskedNew = newPhoneNumber ? newPhoneNumber.slice(0, 3) + '******' + newPhoneNumber.slice(-2) : '010******00';
        document.getElementById('lbl-new-phone').textContent = maskedNew;

        switchSteps(phoneStep2, phoneStep3);

        btn.textContent = 'Verify & Proceed';
        btn.disabled = false;
    });

    // Step 3: Verify New OTP -> Update
    document.getElementById('btn-phone-verify-new').addEventListener('click', async () => {
        const enteredOtp = document.getElementById('otp-new').value;
        const correctOtp = sessionStorage.getItem('otp_new_phone');

        if (enteredOtp !== correctOtp) {
            WaslaUtils.showToast('Invalid OTP', 'error');
            return;
        }

        // Final Update
        const btn = document.getElementById('btn-phone-verify-new');
        btn.textContent = 'Updating...';
        btn.disabled = true;

        await WaslaUtils.delay(500);

        // Update User Object
        const updatedUser = {
            ...user,
            phone: newPhoneNumber
        };

        const success = await updateUser(updatedUser);

        if (success) {
            user.phone = newPhoneNumber;
            WaslaUtils.showToast('Phone Number Updated Successfully', 'success');

            // Update UI
            document.getElementById('phone').value = user.phone;
            phoneModal.classList.add('hidden');
        }

        btn.textContent = 'Verify & Update';
        btn.disabled = false;
    });


    // Helper: Update User Wrapper
    async function updateUser(updatedUser) {
        try {
            const payload = {
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                giftPaused: updatedUser.giftPaused
            };

            const response = await WaslaUtils.apiFetch('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            // Update Current User in Local Session from DB response
            WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, response.user);

            return true;
        } catch (error) {
            WaslaUtils.showToast(error.message || 'Error updating profile', 'error');
            return false;
        }
    }
});
