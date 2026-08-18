# Summary of Changes & Assumptions

## Task 1: Wallet Connection

**Changes Made:**

- **Global State Management:** Created `WalletContext.jsx` and a custom `useWallet` hook to manage a single, shared wallet state across the application.
- **UI Integration:** Integrated the connection flow into `Navbar`, `Home`, and `PropertyDetail` pages. Replaced hover-based dropdowns with a mobile-friendly, state-based dropdown.
- **Core Functionality:** Added MetaMask auto-popup, truncated address display (e.g., `0x1a2b...5678`), auto-restore on page reload, and instant UI updates for account switching.
- **Feedback & Error Handling:** Integrated `react-toastify` for professional notifications. Handled specific MetaMask errors (4001, 4100, 4200, -32002) and added an auto-refresh (1.5s delay) upon network changes.

**Assumptions:**

- `localStorage` provides the best UX for connection persistence across sessions.
- Refreshing the page upon a network/chain change aligns with MetaMask best practices.
- The application should be network-agnostic (no specific blockchain chain restrictions).
- All connect buttons across the app should share the exact same global wallet context.

---

## Task 2: Homepage Responsiveness

**Changes Made:**

- **Fluid Dimensions:** Replaced fixed desktop-only dimensions in `Home.jsx` with responsive Tailwind breakpoints.
- **Hero Section:** Scaled hero height dynamically (`h-[360px]` on mobile up to `lg:h-[600px]` on desktop) to prevent excessive scrolling on phones.
- **Typography & Spacing:** Scaled headings (`text-2xl` to `lg:text-5xl`) and adjusted horizontal/vertical padding across sections (e.g., smaller padding on blog/CTA sections for mobile) to prevent cramped text and edge-to-edge overflow.

**Assumptions:**

- The goal is to make the page comfortable on smaller devices by adjusting scale, spacing, and text sizes, without fundamentally changing the existing desktop design language or structure.

---

## Task 3: Backend Tests & Controller Fixes

**Changes Made (Bug Fixes & Refactors):**

- **Security Fix:** Removed an unsafe external HTTP request and dynamic code execution (`new Function`) that fired on import in `auth.controller.js`.
- **State Leakage Fix:** Scoped the user registration instance locally (`const users = new userM()`) in the auth controller to prevent concurrent requests from overwriting a global variable.
- **Validation Tightened:** Fixed login validation to explicitly reject both missing (`undefined`) and empty string fields before querying the database.
- **Server Crash Fix:** Added `return` statements after error responses in `common.controller.js` to prevent "headers already sent" crashes.
- **Mongoose Update:** Updated `markAsSold` in `property.controller.js` to support modern Mongoose `modifiedCount` alongside legacy `nModified`.
- **Configuration:** Added `npm run test:server` script and updated `package-lock.json` with test dependencies.

**Changes Made (Test Coverage):**

- Added **32 passing Jest tests** across 5 test suites.
- Covered authentication (login, register, password change), common routes (state/city CRUD, email lookup), user details, property operations (CRUD, filtering, mark-as-sold), and SendGrid email routing.

**Assumptions:**

- The remote dynamic-code loader in the auth controller was unsafe, leftover/unintended code, and not a required authentication dependency.
- External services (Database, GridFS, SendGrid) should be mocked in unit tests to ensure fast, deterministic testing environments.
