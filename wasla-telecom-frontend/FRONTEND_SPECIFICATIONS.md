# Frontend Specifications (Backend Integration Guide)

This document provides a comprehensive technical overview of the Wasla Telecom frontend application, explicitly structured to assist backend developers in API integration and database schema mapping.

---

## 1. User Stories (User Journeys)

### Registration & Login
**Registration Flow:**
1. User enters demographic details (Name, Email, Password, Gender, Region/City) and a verified Egyptian phone number on Step 1 of the signup wizard.
2. The user submits the form. The system dynamically validates inputs and transitions to Step 2, dispatching a simulated OTP.
3. **OTP Verification:** The user is prompted with a 6-digit OTP input interface. A toast notification simulating SMS delivery appears (visible for 15 seconds to allow copying).
4. The user completes OTP verification. Upon success, they are automatically persisted to the local store and redirected to the Registration Success page, then to the Dashboard.

**Login Flow:**
1. The user inputs their phone number (or email) and password.
2. The frontend validates the presence of credentials and queries the local store. 
3. If valid, a session is established, and the user is redirected to the Dashboard. If the account status is marked as `blocked` (e.g., by an admin), access is rejected at the logic layer.

### Claiming the 10GB Welcome Gift
1. A new user lands on the Dashboard with a `0GB` data balance.
2. The UI global navigation highlights a **Gift Icon** instead of the "Profile" icon because `profileCompleted` is false.
3. The user clicks the Gift Icon and is redirected to `claim-gift.html`.
4. They completely fill out the detailed Personalization Profiling form (Usage preferences, Hardware ownership, etc.).
5. Upon submission, the frontend marks `profileCompleted: true`, credits `dataBalanceGB` with `10`, and redirects back to the Dashboard.
6. The global header immediately updates globally to hide the Gift icon and permanently display the standard Profile Settings icon.

### Changing Phone Number (Profile settings)
1. The user navigates to the Profile page and presses "Change Number" under Personal Info.
2. **Step 1:** The user enters their new phone number.
3. **Step 2:** The system requests authorization by sending an OTP to the **current** phone number (masked format: `01x******xx`). The user inputs the OTP.
4. **Step 3:** The user is then challenged strictly with a second OTP sent to the **new** phone number.
5. Once fully verified, the updated phone parameter is written to the session and the user is notified.

---

## 2. Form Validations (Strict Rules)

The frontend strictly enforces the following UI validation schemas before network dispatches. Backend endpoints must independently verify these logic assertions:

*   **Phone Numbers:**
    *   Must be strictly numeric.
    *   Must be exactly 11 digits long.
    *   Regex validation: `/^01[0125][0-9]{8}$/` (Must start with valid Egyptian carriers `010`, `011`, `012`, or `015`).
*   **OTP Codes:**
    *   Exactly 6 digits long.
    *   Strictly numeric (Non-numeric characters are actively replaced during `input` tracking).
*   **Passwords:**
    *   Minimum length of 6 characters.
    *   During "Forgot Password" or Registration flows, "Confirm Password" validations ensure an exact match.
*   **Emails:**
    *   Standard browser validation via `<input type="email">`.
    *   Must contain an `@` symbol and valid domain routing.
*   **Personalization Form (Gift Claim):**
    *   **Required Dropdowns:** Internet Service, Contract Type, Payment Method, Avg Consumption.
    *   **Required Radios:** Partner, Dependents, Phone Service, Multiple Lines.
    *   **Required Arrays (Checkboxes):** Notification Preferences (Push, Email, SMS).
    *   **Required Consent:** Privacy Policy explicit agreement flag.
    *   **Numeric Parsing:** Monthly charges input is strictly numeric.

---

## 3. State Management (Current Local Implementation)

The frontend relies heavily on isolated `localStorage` keys to mock a persistent backend database and active sessions:

### Data Stores
*   `wasla_users`: Array modeling the generic Users table.
*   `wasla_current_user`: Mirrors a JWT Session token containing the active user object.
*   `wasla_theme`: Strict binary tracking for 'light' or 'dark' UI rendering preferences.

### The `user` Object Structure
When a user is registered, the typical expected schema is generated:
```javascript
{
  id: "user_17390000",
  phone: "01012345678",
  name: "John Doe",
  email: "john@wasla.com",
  gender: "Male",
  balance: 0,
  dataBalanceGB: 10,       // Starts at 0, bumps to 10 on claiming gift
  profileCompleted: true,  // The absolute flag determining if the gift is unlocked
  giftPaused: false,       // Temporary boolean for toggling gift usability
  status: "active"         // Can be 'blocked' via the mock admin panel
}
```

### Global Header Rendering
The script `js/header.js` evaluates `WaslaUtils.getCurrentUser()` on `DOMContentLoaded`.
*   If `null`, authorization layers are deleted from the DOM (`nav.secondary-nav` hidden, User Context hidden).
*   If active and `profileCompleted === false`, it displays the "Get 10GB" gift icon and hides the profile gear.
*   Once `profileCompleted` flips to `true`, `header.js` universally hides the gift prompt and permanently displays the profile icon.

---

## 4. Expected API Contracts

Below are the expected payload structures for primary interactive endpoints once the Node/Express backend layers are activated.

### 1. Identify & Verify OTP
**POST** `/api/auth/verify-otp`
```json
{
  "phone": "01012345678",
  "otp": "123456",
  "type": "registration" // Enums: 'registration', 'login', 'phone_change_old', 'phone_change_new'
}
```

### 2. Submit Personalization Pipeline (Claim Gift)
**POST** `/api/user/claim-gift`
```json
{
  "partner": "Yes",
  "dependents": "No",
  "phoneService": "Yes",
  "multipleLines": "No",
  "internetService": "Fiber",
  "additionalServices": {
    "onlineSecurity": true,
    "techSupport": false,
    "paperlessBilling": true
  },
  "contractType": "One year",
  "paymentMethod": "Vodafone Cash",
  "monthlyCharges": 450,
  "preferredPackage": "Super Flex 100",
  "avgConsumption": "High",
  "notificationPrefs": ["SMS", "Push Notification"],
  "preferredOffers": "Data, Gaming",
  "privacyPolicy": true
}
```

### 3. Commit Phone Number Change (Double JWT/OTP Authenticated)
**POST** `/api/user/change-phone`
```json
{
  "userId": "user_17390000",
  "newPhone": "01122334455",
  "verificationPayloads": {
    "oldPhoneOtp": "111111",
    "newPhoneOtp": "222222"
  }
}
```
