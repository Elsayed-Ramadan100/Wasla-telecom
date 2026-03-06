/**
 * Signup Page Logic (Multi-step Wizard)
 */

document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const totalSteps = 2;
    let setupData = {};

    // Elements
    const form = document.getElementById('signup-form');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');

    // Initialize
    updateWizardUI(currentStep);

    // Next Button Logic
    btnNext.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!validateStep(currentStep)) return;

        if (currentStep === 1) {
            // Logic for moving from Step 1 to Step 2
            setupData = {
                ...setupData,
                ...getFormData('step-1') // Now captures new fields
            };

            // Check with backend if phone exists by attempting registration
            // Wait, standard flow is we usually register first, then OTP, or OTP then register.
            // Our backend `registerUser` actually creates the user.
            // Let's adapt our flow: We will call /auth/register right now.
            btnNext.disabled = true;
            btnNext.textContent = 'Verifying...';

            try {
                // Remove password confirmation or any client-only fields not meant for backend if needed
                const registerPayload = { ...setupData };

                const response = await WaslaUtils.apiFetch('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(registerPayload)
                });

                // User successfully registered in DB. Now we move to OTP step.
                setupData.id = response.user.id;

                // Temporarily store token for OTP step
                sessionStorage.setItem('temp_reg_token', response.token);
                sessionStorage.setItem('temp_reg_user', JSON.stringify(response.user));

                await simulateSendOTP();
                currentStep++;
                updateWizardUI(currentStep);

            } catch (err) {
                WaslaUtils.showToast(err.message || 'Registration failed', 'error');
            } finally {
                btnNext.disabled = false;
                btnNext.textContent = 'Next';
            }

        } else if (currentStep === 2) {
            // Step 2 Verification with Backend
            const otpCode = Array.from(document.querySelectorAll('.otp-digit'))
                .map(input => input.value).join('');

            try {
                btnNext.disabled = true;
                btnNext.textContent = 'Verifying OTP...';

                const verifyPayload = {
                    phone: setupData.phone,
                    otp: otpCode,
                    type: 'registration'
                };

                await WaslaUtils.apiFetch('/auth/verify-otp', {
                    method: 'POST',
                    body: JSON.stringify(verifyPayload)
                });

                // Cleanup temp storage securely
                sessionStorage.removeItem('temp_reg_token');
                sessionStorage.removeItem('temp_reg_user');

                WaslaUtils.showOtpToast('Phone Verified Successfully. Please Log In.', otpCode);

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } catch (err) {
                WaslaUtils.showToast(err.message || 'Invalid OTP Code', 'error');
                btnNext.disabled = false;
                btnNext.textContent = 'Finish';
            }

        }
    });

    // Prev Button Logic
    btnPrev.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentStep > 1) {
            currentStep--;
            updateWizardUI(currentStep);
        }
    });

    // OTP Input Logic (Mobile Optimized)
    const otpInputs = document.querySelectorAll('.otp-digit');

    otpInputs.forEach((input, index) => {
        // 1. Handle Typing (Input event is best for mobile/virtual keyboards)
        input.addEventListener('input', (e) => {
            const val = input.value;

            // Allow only numbers
            if (!/^\d*$/.test(val)) {
                input.value = val.replace(/\D/g, '');
                return;
            }

            // Auto-advance if digit entered
            if (input.value.length === 1) {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            } else if (input.value.length > 1) {
                // If the user somehow inputs multiple chars at once without 'paste' event (some autocomplete)
                // We truncate to the first char
                input.value = input.value[0];
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
        });

        // 2. Handle Navigation (Backspace)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value) {
                // If empty and backspace pressed, move to previous
                if (index > 0) {
                    otpInputs[index - 1].focus();
                    // Optional: Prevent default backspace if we want to retain previous char or not? 
                    // Standard behavior is usually just focus back. 
                    // Often good to delete the prev char too if we move back? 
                    // Requirement says: "Moving to the previous box when the user presses Backspace"
                    // It doesn't explicitly say "delete". But usually changing focus is enough.
                }
            }
        });

        // 3. Handle Paste (Active distribution)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pasteData.replace(/\D/g, '').split('');

            if (digits.length === 0) return;

            let currentIndex = index;
            // Distribute digits starting from the focused input
            digits.forEach(digit => {
                if (currentIndex < otpInputs.length) {
                    otpInputs[currentIndex].value = digit;
                    otpInputs[currentIndex].focus();
                    currentIndex++;
                }
            });
        });
    });

    // Helper functions
    function updateWizardUI(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
        // Show current step
        document.getElementById(`step-${step}`).classList.add('active');

        // Update Wizard Dots
        for (let i = 1; i <= totalSteps; i++) {
            const dot = document.querySelector(`.wizard-step[data-step="${i}"]`);
            if (i < step) {
                dot.className = 'wizard-step completed';
                dot.innerHTML = '✓';
            } else if (i === step) {
                dot.className = 'wizard-step active';
                dot.innerHTML = i;
            } else {
                dot.className = 'wizard-step';
                dot.innerHTML = i;
            }
        }

        // Buttons
        btnPrev.style.display = step === 1 ? 'none' : 'inline-block';
        btnNext.textContent = step === totalSteps ? 'Finish & Claim Gift' : 'Next';

        // Scroll to top
        window.scrollTo(0, 0);
    }

    function validateStep(step) {
        if (step === 1) {
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const gender = document.getElementById('gender').value;
            const country = document.getElementById('country').value;
            const state = document.getElementById('state').value;
            const city = document.getElementById('city').value;

            if (name.length < 2) return errorMessage('Name must be at least 2 chars'); // Requirement: minlength=2
            if (!gender) return errorMessage('Please select a gender');
            if (!country) return errorMessage('Please select a country');
            if (!state) return errorMessage('Please enter state/governorate');
            if (!city) return errorMessage('Please enter city');
            if (!/^01[0125][0-9]{8}$/.test(phone)) return errorMessage('Invalid Egyptian phone number');
            if (!email || !email.includes('@')) return errorMessage('Invalid email address');
            if (password.length < 6) return errorMessage('Password must be at least 6 chars');
        }
        return true;
    }

    function errorMessage(msg) {
        WaslaUtils.showToast(msg, 'error');
        return false;
    }

    function getFormData(stepId) {
        const container = document.getElementById(stepId);
        const data = {};

        // Inputs & Selects
        const inputs = container.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select');
        inputs.forEach(input => {
            if (input.id) data[input.id] = input.value;
        });

        // Radios
        // Find all unique names for radios in this step
        const radioNames = new Set();
        container.querySelectorAll('input[type="radio"]').forEach(r => radioNames.add(r.name));
        radioNames.forEach(name => {
            const checked = container.querySelector(`input[name="${name}"]:checked`);
            if (checked) data[name] = checked.value;
            else data[name] = null; // Or undefined
        });

        // Checkboxes (Groups with same name)
        const checkboxNames = new Set();
        container.querySelectorAll('input[type="checkbox"][name]').forEach(c => checkboxNames.add(c.name));
        checkboxNames.forEach(name => {
            const checked = Array.from(container.querySelectorAll(`input[name="${name}"]:checked`)).map(c => c.value);
            data[name] = checked;
        });

        // Single Checkboxes (IDs) - e.g. privacyPolicy, individual toggles
        container.querySelectorAll('input[type="checkbox"][id]:not([name])').forEach(c => {
            data[c.id] = c.checked;
        });

        return data;
    }

    async function simulateSendOTP() {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem('wasla_signup_otp', code);

        btnNext.disabled = true;
        btnNext.textContent = 'Sending OTP...';

        await WaslaUtils.delay(500); // Network send delay

        WaslaUtils.showOtpToast(`OTP Sent to your phone: ${code}`, code);

        btnNext.disabled = false;
        btnNext.textContent = 'Verify';
    }
});

/**
 * DEVELOPER NOTE:
 * New fields are collected from Step 1 and Step 3 and saved to 'wasla_users' in localStorage.
 * 
 * Storage Key: 'wasla_users' (Array of User Objects)
 * 
 * New Fields Mapping:
 * - Personal: fullName (from #name), gender, country, state, city
 * - Contact: phone, email, password
 * - Usage: partner, dependents, phoneService, multipleLines, internetService, 
 *          onlineSecurity (bool), onlineBackup (bool), deviceProtection (bool), 
 *          techSupport (bool), streamingTV (bool), streamingMovies (bool), 
 *          paperlessBilling (bool), contractType, paymentMethod, monthlyCharges, 
 *          preferredPackage, avgConsumption.
 * - Preferences: notificationPrefs (Array), preferredOffers, switchReason.
 * - Consent: privacyPolicy (bool).
 * 
 * Note: 'id' is verified against 'phone' for uniqueness. 
 * Backend mapping should map these keys 1:1 to the User model.
 */
