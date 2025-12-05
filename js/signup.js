/**
 * Signup Page Logic (Multi-step Wizard)
 */

document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const totalSteps = 3;
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
                ...getFormData('step-1')
            };

            // Simulate checking if phone exists
            try {
                const users = WaslaUtils.getStore(WaslaUtils.STORAGE_KEYS.USERS) || [];
                if (users.find(u => u.phone === setupData.phone)) {
                    WaslaUtils.showToast('Phone number already registered', 'error');
                    return;
                }

                await simulateSendOTP();
                currentStep++;
                updateWizardUI(currentStep);
            } catch (err) {
                WaslaUtils.showToast(err.message, 'error');
            }

        } else if (currentStep === 2) {
            // Step 2 Verification
            const otpCode = Array.from(document.querySelectorAll('.otp-digit'))
                .map(input => input.value).join('');

            const storedOtp = sessionStorage.getItem('wasla_signup_otp');

            if (otpCode !== storedOtp) {
                WaslaUtils.showToast('Invalid OTP Code', 'error');
                return;
            }

            WaslaUtils.showToast('Phone Verified Successfully', 'success');
            currentStep++;
            updateWizardUI(currentStep);

        } else if (currentStep === 3) {
            // Final Submission
            setupData = {
                ...setupData,
                ...getFormData('step-3')
            };

            try {
                btnNext.disabled = true;
                btnNext.textContent = 'Creating Account...';
                await WaslaUtils.delay(1000);

                WaslaUtils.registerUser(setupData);
                window.location.href = 'registration-success.html';
            } catch (err) {
                WaslaUtils.showToast(err.message, 'error');
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
    }

    function validateStep(step) {
        if (step === 1) {
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;

            if (name.length < 3) return errorMessage('Name must be at least 3 chars');
            if (!/^01[0125][0-9]{8}$/.test(phone)) return errorMessage('Invalid Egyptian phone number');
            if (password.length < 6) return errorMessage('Password must be at least 6 chars');
        }
        if (step === 3) {
            if (!document.getElementById('terms').checked) return errorMessage('You must accept the terms');
        }
        return true;
    }

    function errorMessage(msg) {
        WaslaUtils.showToast(msg, 'error');
        return false;
    }

    function getFormData(stepId) {
        const inputs = document.querySelectorAll(`#${stepId} input, #${stepId} select`);
        const data = {};
        inputs.forEach(input => {
            if (input.type === 'checkbox') data[input.id] = input.checked;
            else data[input.id] = input.value;
        });
        return data;
    }

    async function simulateSendOTP() {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem('wasla_signup_otp', code);

        btnNext.disabled = true;
        btnNext.textContent = 'Sending OTP...';

        await WaslaUtils.delay(500); // Network send delay

        WaslaUtils.showToast(`OTP Sent to your phone: ${code}`, 'success'); // Show code for demo purposes

        btnNext.disabled = false;
        btnNext.textContent = 'Verify';
    }
});
