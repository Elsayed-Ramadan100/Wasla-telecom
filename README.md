# Wasla Telecom - Frontend Project

A complete, frontend-only simulation of a Telecom provider website.
Built with HTML5, CSS3, and Vanilla JavaScript.

## How to Run
1. **Unzip** the project (if archived).
2. Open the project folder.
3. **Double-click** `index.html` to open it in your browser.
   - *Note: No server installation (Node.js/Python) is required. It runs directly in the browser via `file://` protocol.*

## Project Structure
- `index.html`: Landing page.
- `signup.html`: Multi-step registration wizard.
- `dashboard.html`: Main user control panel.
- `css/`: Contains all stylesheets (one per page + `base.css` for shared styles).
- `js/`: Contains all logic (one per page + `utils.js` for simulated backend).
- `mock-data.json`: Reference file showing the structure of data.

## Simulation Features
- **Mock Backend**: Uses `localStorage` to persist users, sessions, and transactions.
- **Data Seeding**: On the first run, it populates default Offers into your browser storage.
- **Network Delay**: Simulated delays (promises) to mimic real API calls.
- **Gift System**: New users automatically get 10GB added to their balance on signup.

## Developer Notes
- **User Session**: Stored in `localStorage` under `wasla_current_user`.
- **Resetting Data**: To clear all data, open the browser console (F12) and run `localStorage.clear()`, then refresh `index.html`.
- **Libraries used**:
  - `Chart.js` (via CDN) for Usage charts.
  - `jspdf` (via CDN) for generating PDF reports.

## Credentials
You can Sign Up with any new number, or check the Admin panel (`admin.html`) to see registered users.
Default mock data does not include pre-registered users, so please **Register** first.
