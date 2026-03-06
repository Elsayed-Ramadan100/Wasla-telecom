# 📘 Wasla Telecom — Technical Documentation

Comprehensive technical reference for the Wasla Telecom project. Intended for developers onboarding to the codebase, contributors, and technical reviewers.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────┐         HTTP/REST
│       Frontend (Static HTML/JS)      │ ─────────────────►  ┌──────────────────────────────────┐
│                                      │                      │  Backend (Node.js / Express)     │
│  - index.html, dashboard.html, etc.  │ ◄─────────────────  │                                  │
│  - js/ (fetch via apiFetch())        │         JSON         │  - server.js (entry point)       │
│  - js/utils.js (session + API shim)  │                      │  - routes/ (URL dispatching)     │
└──────────────────────────────────────┘                      │  - controllers/ (business logic) │
                                                              │  - middleware/ (JWT + RBAC)      │
                                                              └──────────────┬───────────────────┘
                                                                             │ Prisma ORM
                                                                             ▼
                                                             ┌───────────────────────────────────┐
                                                             │   PostgreSQL Database              │
                                                             │  (User, Admin, BillingHistory …)   │
                                                             └───────────────────────────────────┘
```

---

### 1.1 Backend Architecture

The backend is a **Node.js / Express** application (`"type": "module"` — ES Modules) organized into four layers:

#### Entry Point — `server.js`
- Bootstraps Express with `cors()` and `express.json()` middleware
- Mounts three route groups: `/api/auth`, `/api/user`, `/api/admin`
- Exposes `GET /api/health` that runs `SELECT 1` against PostgreSQL to confirm connectivity
- Default port: `process.env.PORT || 3000`

#### Routes — `routes/`

| File | Prefix | Access |
|---|---|---|
| `authRoutes.js` | `/api/auth` | Public |
| `userRoutes.js` | `/api/user` | Protected (user JWT via `protect`) |
| `adminRoutes.js` | `/api/admin` | Protected (admin JWT + RBAC) |

#### Controllers — `controllers/`

| File | Responsibility |
|---|---|
| `authController.js` | Registration with bcrypt, login → JWT, OTP verification |
| `userController.js` | Subscriptions, billing, recharge, profile CRUD, points redemption |
| `adminController.js` | Staff management, user view/edit/block/delete, purchase-on-behalf |
| `adminAuthController.js` | Admin login — returns an admin-scoped JWT with `role` in payload |

#### Middleware — `middleware/`

| File | Export | What It Does |
|---|---|---|
| `authMiddleware.js` | `protect` | Verifies user JWT; attaches decoded payload to `req.user` |
| `adminAuthMiddleware.js` | `authenticateAdmin` | Verifies admin JWT; **rejects any token that lacks a `role` field** (prevents user tokens from accessing admin routes) |
| `adminAuthMiddleware.js` | `requireOwner` | Hard check: `req.admin.role === 'owner'`. Used for all staff management routes |
| `adminAuthMiddleware.js` | `requirePermission(flag)` | Factory middleware — checks a specific boolean field on the admin JWT payload. Owners bypass automatically |

---

### 1.2 Frontend Architecture

The frontend is a **multi-page static application** (HTML/CSS/JS). There are no build steps — pages communicate with the backend exclusively via `fetch()`, wrapped in `apiFetch()` from `utils.js`.

#### Key Modules in `js/`

| File | Role |
|---|---|
| `utils.js` | **Master utility module (IIFE pattern).** Exports `apiFetch`, `clearUserSession`, `logoutUser`, `showToast`, `getCurrentUser`, `getToken`, `formatCurrency`, and others |
| `login.js` | Login form; calls `clearUserSession()` then stores new session; checks blocked status before accepting token |
| `usage.js` | Fetches subscriptions from `/api/user/subscriptions`; renders Chart.js donut chart; handles cancel-package modal flow |
| `admin.js` | Renders user table; handles real-time search filter; calls all admin management API routes |

#### Standard Data Flow (User Action → DB → UI)

```
1. User clicks an action (e.g., "Subscribe")
2. Page JS calls WaslaUtils.apiFetch('/user/subscribe', { method: 'POST', body: ... })
3. apiFetch() reads token from localStorage['wasla_jwt_token'] and injects:
      Authorization: Bearer <token>
4. Backend 'protect' middleware verifies JWT → populates req.user
5. Controller scopes ALL database operations to req.user.id (never from req.body)
6. Prisma transaction executes atomically; JSON response returned
7. Page JS re-renders UI from response data
```

---

## 2. Database Schema

Managed by **Prisma ORM** (PostgreSQL provider). Defined in `wasla-telecom-backend/prisma/schema.prisma`.

### Entity Relationships

```
User ──────────────┬──── UserPersonalization  (1:1,  onDelete: Cascade)
                   ├──── BillingHistory[]     (1:Many, onDelete: Cascade)
                   ├──── SupportTicket[]      (1:Many, onDelete: Cascade)
                   └──── Reward[]             (1:Many, onDelete: Cascade)

Admin  (standalone — no FK relation to User)
Offer  (standalone catalog — read by controllers at subscribe time)
```

---

### 2.1 `User` — Core Customer Model

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `String` (UUID) | `uuid()` | Primary key |
| `phone` | `String` | — | **Unique.** Login identifier |
| `name` | `String` | — | Full name |
| `email` | `String?` | — | Optional |
| `passwordHash` | `String` | — | bcrypt hash |
| `gender` | `String?` | — | Optional |
| `region` | `String?` | — | Optional |
| `balance` | `Float` | `0` | Monetary balance in EGP |
| `dataBalanceGB` | `Int` | `0` | **Active total data quota (GB). Source of truth for all GB display.** |
| `points` | `Int` | `0` | Reward points balance |
| `profileCompleted` | `Boolean` | `false` | True after claim-gift onboarding |
| `giftPaused` | `Boolean` | `false` | Controls welcome-gift active state |
| `status` | `String` | `"active"` | `"active"` or `"blocked"` |
| `createdAt` | `DateTime` | `now()` | Auto |
| `updatedAt` | `DateTime` | — | Auto-updated |

---

### 2.2 `Admin` — Admin & Staff Accounts

Completely separate from the `User` model. No foreign key relationship exists between them.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `String` (UUID) | `uuid()` | Primary key |
| `username` | `String` | — | **Unique.** Login handle |
| `passwordHash` | `String` | — | bcrypt hash |
| `role` | `String` | `"staff"` | `"owner"` or `"staff"` |
| `canViewUsers` | `Boolean` | `false` | Permission flag |
| `canEditUsers` | `Boolean` | `false` | Permission flag |
| `canManageBilling` | `Boolean` | `false` | Permission flag |
| `canModerateUsers` | `Boolean` | `false` | Permission flag |
| `canDeleteUsers` | `Boolean` | `false` | Permission flag |
| `canManageOffers` | `Boolean` | `false` | Permission flag |

---

### 2.3 `Offer` — Package Catalog

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Custom slug, e.g. `"offer_1"` |
| `name` | `String` | Display name |
| `price` | `Float` | Cost in EGP |
| `dataGB` | `Int` | GB allocation |
| `minutes` | `Int` | Call minutes |
| `validityDays` | `Int` | Package duration |
| `type` | `String` | `"bundle"`, `"addon"`, etc. |
| `description` | `String` | Full description |

---

### 2.4 `BillingHistory` — Transaction Log

This is the most architecturally important model beyond `User`.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | `String` (UUID) | `uuid()` | Primary key |
| `userId` | `String` | — | FK → `User.id`, cascades on delete |
| `amount` | `Float` | — | EGP amount |
| `date` | `DateTime` | `now()` | Auto |
| `status` | `String` | — | `"Success"`, `"Pending"`, `"Failed"`, `"Cancelled"` |
| `description` | `String` | — | Human-readable. e.g. `"Subscription: Super Flex 100"` |
| `dataGB` | `Int` | `0` | **GB locked at purchase time. Used for exact cancellation deduction.** |

> **Design Decision:** The `dataGB` field is the architectural linchpin of the data balance system. See Section 4.1 for full details.

---

### 2.5 `UserPersonalization`

One-to-one with `User`. Flattened into individual columns (not JSON) to enable **direct Power BI tabular model integration** without transform steps.

Key fields: `internetService`, `contractType`, `paymentMethod`, `monthlyCharges`, `preferredPackage`, `avgConsumption`, `notifySms`, `notifyPush`, `notifyEmail`, `preferredOffers`, `streamingTV`, `streamingMovies`.

---

### 2.6 `SupportTicket`

| Field | Notes |
|---|---|
| `subject` | Ticket description |
| `status` | `"Open"`, `"Closed"`, `"In Progress"` |
| `priority` | `"Low"`, `"High"`, `"Critical"` |

---

### 2.7 `Reward`

Log of point-earning and point-redemption events per user.

| Field | Notes |
|---|---|
| `points` | Positive = earned, Negative = redeemed |
| `description` | Event description |
| `dateEarned` | Auto timestamp |

---

## 3. API Endpoints Reference

Base URL: `http://localhost:3000`

### 3.1 Auth — `/api/auth` (Public)

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ phone, name, password, gender, region, ... }` | Register new user |
| `POST` | `/api/auth/login` | `{ phone, password }` | Login → returns JWT |
| `POST` | `/api/auth/verify-otp` | `{ phone, otp }` | Verify registration OTP |

**Login response:**
```json
{
  "success": true,
  "token": "<JWT>",
  "user": { "id": "...", "name": "...", "phone": "...", "status": "active" }
}
```

---

### 3.2 User — `/api/user` (Protected: `Authorization: Bearer <token>`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user/profile` | Full profile (no `passwordHash` in response) |
| `PUT` | `/api/user/profile` | Update name, email, phone, giftPaused |
| `DELETE` | `/api/user/profile` | Permanently delete account (cascades all related records) |
| `POST` | `/api/user/recharge` | `{ amount, description }` — increments balance |
| `POST` | `/api/user/claim-gift` | Runs `$transaction`: create personalization + add 10 GB |
| `POST` | `/api/user/subscribe` | `{ offerId, amount, description, dataGB }` — 3-step transaction |
| `GET` | `/api/user/subscriptions` | Active subscriptions derived from billing records |
| `DELETE` | `/api/user/subscriptions/:id` | Cancel package — deducts `record.dataGB` from user |
| `GET` | `/api/user/billing-history` | Full ordered billing history for authenticated user |
| `POST` | `/api/user/redeem-points` | `{ pointsToRedeem, type }` — converts points to EGP |

> **Security constraint:** Every controller reads `userId` exclusively from `req.user.id` (the verified JWT payload). The request body is never trusted for identity.

---

### 3.3 Admin — `/api/admin`

#### Auth (Public)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/auth/login` | Admin login → admin JWT with role+permissions in payload |

#### Staff Management (Owner only — `requireOwner`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/staff` | Create staff account |
| `GET` | `/api/admin/staff` | List all staff |
| `PUT` | `/api/admin/staff/:id` | Update staff permission flags |
| `DELETE` | `/api/admin/staff/:id` | Delete staff account |

#### User Management (Permission-gated)
| Method | Path | Required Flag | Description |
|---|---|---|---|
| `GET` | `/api/admin/users` | `canViewUsers` | List/search all users |
| `PUT` | `/api/admin/users/:id` | `canEditUsers` | Edit user details (OTP-bypass) |
| `POST` | `/api/admin/users/:id/purchase` | `canManageBilling` | Purchase package on behalf (logs as `"Admin Bypass Purchase"`) |
| `PUT` | `/api/admin/users/:id/status` | `canModerateUsers` | Block or unblock a user |
| `DELETE` | `/api/admin/users/:id` | `canDeleteUsers` | Permanently wipe user + cascade |

---

## 4. Architecture Deep-Dives

### 4.1 Data Isolation — The `dataGB` Solution

**The Problem (pre-patch):** Before the fix, when a subscription was cancelled, the controller tried to extract GB count by parsing the `description` string (e.g., `"Subscription: Super Flex 100"`) and mapping the package name back to a GB value via regex or a static table. This was error-prone and broke when package names changed.

**The Solution:** The `dataGB` column in `BillingHistory` **permanently records the GB value at the moment of purchase**. This value never changes and is completely independent of the `Offer` catalog.

**Subscribe flow** (`subscribeToOffer`):
```js
// dataGB is passed from the frontend (which reads it from the Offer record)
const addedGB = parseInt(dataGB) || 0;

prisma.$transaction([
    prisma.user.update({ data: { dataBalanceGB: { increment: addedGB } } }),
    prisma.billingHistory.create({ data: { ..., dataGB: addedGB } }) // ← locked
])
```

**Cancel flow** (`cancelSubscription`):
```js
// Step 1: Find billing record WHERE userId matches (ownership check built-in)
const record = await prisma.billingHistory.findFirst({
    where: { id: recordId, userId: userId, ... }
});

// Step 2: Read the authoritative GB — NO string parsing, NO regex, NO offer lookup
const dataToDeduct = record.dataGB || 0;

// Step 3: Safely strip quota with floor-at-zero guard
const newBalanceGB = Math.max(0, (userState.dataBalanceGB || 0) - dataToDeduct);
```

The `findFirst` query with `userId: userId` also acts as an **ownership guard** — a user cannot cancel a subscription belonging to another user even if they know the record ID.

---

### 4.2 Data Isolation — Billing History Endpoint

The `GET /api/user/billing-history` endpoint is the simplest but most security-critical user endpoint:

```js
export const getBillingHistory = async (req, res) => {
    const userId = req.user.id; // From verified JWT — never from req.body or req.query

    const history = await prisma.billingHistory.findMany({
        where: { userId },  // Hard DB-level filter — guaranteed user-scoped
        orderBy: { date: 'desc' }
    });

    res.json({ success: true, history });
};
```

The `where: { userId }` clause is enforced at the database level by PostgreSQL, not by application-level filtering. Even if the JWT verification middleware were to fail, **no cross-user data can be returned** because the SQL `WHERE` clause will never match.

---

### 4.3 `clearUserSession()` — Frontend Data Isolation

**The Problem:** `localStorage` persists across browser tab sessions. Without explicit cleanup, User A's balance, billing history, and profile data would be visible to User B when they log in on the same machine.

**The implementation** in `js/utils.js`:

```js
// Keyed constants — no magic strings scattered across the codebase
const STORAGE_KEYS = {
    CURRENT_USER: 'wasla_current_user',
    TOKEN:        'wasla_jwt_token',
    BILLING:      'wasla_billing',
    TICKETS:      'wasla_tickets',
    THEME:        'wasla_theme'      // Not wiped — theme is non-personal
};

function clearUserSession() {
    // Explicit key removal — belt-and-suspenders over localStorage.clear()
    // (clear() would also wipe theme and other non-personal prefs)
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.BILLING);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
}

function logoutUser() {
    clearUserSession();
    window.location.href = 'login.html';
}
```

**The critical call in `js/login.js`:**
```js
// On successful API response but BEFORE writing any new session data:
WaslaUtils.clearUserSession();          // ← wipes previous session
localStorage.setItem(STORAGE_KEYS.TOKEN, result.token);
WaslaUtils.setStore(STORAGE_KEYS.CURRENT_USER, result.user);
```

Note that `clearUserSession()` is called **even before the new token is written**. This is intentional — if `clearUserSession()` were called after, there would be a brief window where both sessions coexist.

---

### 4.4 Admin JWT Isolation (Token Type Enforcement)

Both user and admin tokens are signed with the same `JWT_SECRET`. Without a type check, a user token could theoretically be submitted to an admin endpoint and pass basic `jwt.verify()`.

The `authenticateAdmin` middleware prevents this:

```js
const decoded = jwt.verify(token, JWT_SECRET);

// Admin tokens have a `role` field. User tokens do not.
if (!decoded.role) {
    return res.status(403).json({
        success: false,
        message: 'Access denied. Generic user token provided instead of admin token.'
    });
}

req.admin = decoded; // contains: { id, username, role, canViewUsers, canEditUsers, ... }
```

The admin login controller embeds all six permission flags directly into the JWT payload at sign time. This means `requirePermission()` can check permissions **without an additional database round-trip** on every request.

---

### 4.5 RBAC — Two-Tier Implementation

```
               ┌─────────────────────┐
 All Admins →  │  authenticateAdmin  │  Verifies JWT; enforces token type
               └──────────┬──────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     Staff management         Per-operation endpoints
              │                         │
        ┌─────▼──────┐          ┌───────▼──────┐
        │ requireOwner│          │requirePermission│
        │ role=owner  │          │ (flag)          │
        │ only        │          │ owner bypasses  │
        └─────────────┘          └─────────────────┘
```

**`requireOwner`** — hard role check, zero exceptions:
```js
if (req.admin.role !== 'owner') return res.status(403).json({ ... });
```

**`requirePermission(flag)`** — factory middleware, owner auto-pass:
```js
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (req.admin.role === 'owner') return next(); // Owner bypass
        if (req.admin[permission] !== true) {
            return res.status(403).json({ ... });
        }
        next();
    };
};
```

---

## 5. Development Utilities

### Prisma Studio (Visual DB Browser)
```bash
# Run from wasla-telecom-backend/
npx prisma studio
# Opens at http://localhost:5555
```

### Health Check
```
GET http://localhost:3000/api/health
→ { "status": "success", "message": "Database connected perfectly!" }
```

### Nodemon Dev Server
```bash
npm run dev
# Equivalent to: nodemon server.js
```

### Re-Seed Owner Account
Safe to re-run at any time (uses `upsert`). Required after adding new permission columns to the `Admin` model:
```bash
node seedAdmin.js
```

### Schema Changes Workflow
When editing `prisma/schema.prisma`:
```bash
npx prisma db push --accept-data-loss  # Sync schema to DB
npx prisma generate                     # Regenerate Prisma Client
# Then restart the server
```
