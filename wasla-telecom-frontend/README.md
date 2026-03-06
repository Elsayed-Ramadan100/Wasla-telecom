# 🌐 Wasla Telecom — Full Stack Project

> A complete telecom customer portal built with Node.js, Express, Prisma ORM, and PostgreSQL. Features a user-facing portal with dynamic data management and an Admin dashboard with granular Role-Based Access Control (RBAC).

---

## 📋 Project Overview

**Wasla Telecom** is a full-stack telecom management platform with two distinct portals:

### 👤 User Portal
- **Secure Registration & Login** with phone number + OTP verification
- **Dashboard** displaying live balance, data quota (GB), and reward points via Chart.js
- **Offers & Subscriptions** — browse, subscribe to, and cancel data/bundle packages
- **Dynamic Data Balance** — `dataBalanceGB` (in the `User` table) is atomically incremented on subscribe and precisely decremented on cancellation using the `dataGB` field locked in `BillingHistory` at purchase time
- **Billing History** — full transaction log with Credit/Debit entries and status badges
- **Reward Points** — earned on every purchase, redeemable to wallet balance or Vodafone Cash
- **Recharge Balance** — top up account via multiple payment methods
- **Profile Management** — update personal info, notification preferences, and service options
- **Support Tickets** — submit and track support requests

### 🛡️ Admin Portal
- **Separate Login** at `/admin-login.html` with its own admin-scoped JWT
- **Role-Based Access Control (RBAC)** — Owner and Staff roles with six granular boolean permission flags
- **User Search & Management** — search, view, edit, block/unblock, and permanently delete users
- **Staff Management** — Owner creates staff accounts and assigns per-operation permissions
- **Purchase on Behalf** — admin can subscribe a user to a package (logged as `"Admin Bypass Purchase"`)
- **Analytics** — Chart.js data visualizations on the admin dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v18+) |
| **Framework** | Express.js v4 |
| **ORM** | Prisma v6 |
| **Database** | PostgreSQL (v14+) |
| **Auth** | JSON Web Tokens (`jsonwebtoken` v9) |
| **Password Hashing** | bcrypt v5 |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Charts** | Chart.js |
| **Dev Tool** | Nodemon |

---

## ✅ Prerequisites

Before setting up this project, make sure the following are installed:

1. **Node.js** (v18 or later) — [nodejs.org](https://nodejs.org/)
2. **PostgreSQL** (v14 or later) — [postgresql.org](https://www.postgresql.org/download/)
3. **Git** — [git-scm.com](https://git-scm.com/)

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd web4
```

### Step 2: Install Backend Dependencies

Navigate into the backend folder and install all packages:

```bash
cd wasla-telecom-backend
npm install
```

This installs: `express`, `@prisma/client`, `prisma`, `jsonwebtoken`, `bcrypt`, `dotenv`, `cors`, and `nodemon`.

---

### Step 3: Configure Environment Variables

Inside `wasla-telecom-backend/`, create a file named **`.env`**:

```env
# wasla-telecom-backend/.env

# PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/wasla_telecom"

# JWT Secret — use a long, random string in production
JWT_SECRET="your_super_secret_jwt_key_here"

# Optional: Override the default server port
PORT=3000
```

> ⚠️ **Never commit your `.env` file.** It is already excluded by `.gitignore`.

#### Variable Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | Full PostgreSQL connection URL |
| `JWT_SECRET` | ✅ Yes | Signs and verifies all JWT tokens (user and admin) |
| `PORT` | ❌ Optional | Defaults to `3000` if omitted |

---

### Step 4: Push the Schema to Your Database

> **⚠️ Important — Use `db push`, not `migrate dev`.**
> This project uses `prisma db push` instead of `prisma migrate dev`. On an existing or shared database, `migrate dev` can cause data loss by resetting your database. `db push` safely syncs the schema to whatever state is defined in `schema.prisma` without destroying existing records.

**4a. Push the schema (creates all tables):**
```bash
npx prisma db push --accept-data-loss
```
The `--accept-data-loss` flag is required when a schema change would drop or alter an existing column. It is safe to use during setup.

**4b. Generate the Prisma Client:**
```bash
npx prisma generate
```
This generates the type-safe database client used throughout the controllers. Must be run on any new machine after `npm install`.

> 💡 **Tip:** Run `npx prisma studio` to open a visual browser for your database at `http://localhost:5555`.

---

### Step 5: Seed the Owner Admin Account

Before the Admin portal is usable, create the initial **Owner** account:

```bash
node seedAdmin.js
```

This uses Prisma's `upsert`, so it is safe to re-run at any time. It will create or update the owner account with the following credentials and full privileges:

| Field | Value |
|---|---|
| **Username** | `owner` |
| **Password** | `superuser123` |
| **Role** | `owner` |
| **All 6 Permissions** | `true` |

> 🔒 **Security Note:** Change the owner password immediately after first login in production.

---

### Step 6: Start the Server

```bash
node server.js
```

Or for development with auto-restart on file changes:

```bash
npm run dev
```

The console will show:

```
========================================
🚀 Wasla Telecom Backend is running!
📡 URL: http://localhost:3000
========================================
```

Verify database connectivity: `GET http://localhost:3000/api/health`

---

### Step 7: Open the Frontend

The frontend is a static multi-page application in `wasla-telecom-frontend/`. Open `index.html` directly in your browser, or use VS Code's **Live Server** extension for local serving.

> All API calls target `http://localhost:3000` — **the backend must be running first.**

---

## ✨ Key Features: Technical Highlights

### � The `dataGB` Persistent Data Solution

The core innovation of the data balance system is that **the GB value of a package is locked into the `BillingHistory` record at the moment of purchase** (the `dataGB` column). This means:

- On **subscribe**: `dataBalanceGB` on the `User` is incremented AND `dataGB` is saved in the new `BillingHistory` record.
- On **cancel**: The controller reads `record.dataGB` directly from the billing record — not from a re-lookup of the offer — and deducts that exact value from `User.dataBalanceGB`.
- This guarantees that if offer prices or quotas change, cancellations always apply the **original purchased quota**, not a potentially different current value.

```js
// From cancelSubscription controller (userController.js)
const dataToDeduct = record.dataGB || 0;
const newBalanceGB = Math.max(0, (userState.dataBalanceGB || 0) - dataToDeduct);
```

The `Math.max(0, ...)` guard prevents `dataBalanceGB` from going negative.

---

### 🔐 "Clean Slate" Session Policy (Security Patch)

A critical security patch was implemented to prevent cross-user data leakage via stale `localStorage`. The fix lives in two places:

**`js/utils.js` — `clearUserSession()` function:**
```js
function clearUserSession() {
    // Wipe ALL user-specific keys to prevent cross-user data leakage
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); // 'wasla_current_user'
    localStorage.removeItem(STORAGE_KEYS.TOKEN);         // 'wasla_jwt_token'
    localStorage.removeItem(STORAGE_KEYS.BILLING);       // 'wasla_billing'
    localStorage.removeItem(STORAGE_KEYS.TICKETS);       // 'wasla_tickets'
}
```

**`js/login.js` — called at the start of every new login:**
```js
// Wipe any previous session before establishing new one (prevents cross-user leak)
WaslaUtils.clearUserSession();
// Save Token and Session securely
localStorage.setItem(WaslaUtils.STORAGE_KEYS.TOKEN, result.token);
WaslaUtils.setStore(WaslaUtils.STORAGE_KEYS.CURRENT_USER, result.user);
```

The `clearUserSession()` call happens **before** any new session data is written. This guarantees that even if User A closes the browser without logging out, User B loggin in next will start with a completely empty session.

---

### � RBAC — Admin Permission Matrix

The admin system uses six boolean permission flags on each `Admin` record. Staff accounts are blocked unless their specific flag is `true`. The `owner` role bypasses all flag checks automatically.

| Permission Flag | Protected Operation |
|---|---|
| `canViewUsers` | `GET /api/admin/users` |
| `canEditUsers` | `PUT /api/admin/users/:id` |
| `canManageBilling` | `POST /api/admin/users/:id/purchase` |
| `canModerateUsers` | `PUT /api/admin/users/:id/status` (block/unblock) |
| `canDeleteUsers` | `DELETE /api/admin/users/:id` |
| `canManageOffers` | Create/manage telecom offers |

---

## 📁 Project Structure

```
web4/
├── wasla-telecom-backend/
│   ├── controllers/
│   │   ├── authController.js       # Register, Login, OTP
│   │   ├── userController.js       # All user operations (subscriptions, billing, etc.)
│   │   ├── adminController.js      # Admin user & staff management
│   │   └── adminAuthController.js  # Admin login → issues admin JWT
│   ├── middleware/
│   │   ├── authMiddleware.js        # User JWT guard ('protect')
│   │   └── adminAuthMiddleware.js   # Admin JWT + requireOwner + requirePermission()
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth/*
│   │   ├── userRoutes.js           # /api/user/* (all protected)
│   │   └── adminRoutes.js          # /api/admin/* (RBAC-gated)
│   ├── prisma/
│   │   └── schema.prisma           # Database schema
│   ├── seedAdmin.js                # Owner account seeder (upsert)
│   ├── server.js                   # Express entry point
│   └── .env                        # ⚠️ Not committed — create manually
│
└── wasla-telecom-frontend/
    ├── index.html                   # Landing page
    ├── login.html / signup.html     # Auth pages
    ├── admin.html / admin-login.html # Admin portal
    ├── dashboard.html               # User dashboard
    ├── usage.html                   # Data usage with Chart.js
    ├── payment.html                 # Billing & recharge
    ├── profile.html                 # Profile settings
    ├── offers.html                  # Package catalogue
    ├── js/
    │   ├── utils.js                 # apiFetch, clearUserSession, logoutUser
    │   ├── login.js                 # Login flow + session wipe
    │   ├── usage.js                 # Subscription grid + Chart.js render
    │   └── ...                      # Other page scripts
    └── css/                         # Page-specific stylesheets
```

---

## 📄 License

ISC © Wasla Telecom
