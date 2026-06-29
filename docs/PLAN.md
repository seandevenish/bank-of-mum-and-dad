# Bank of Mum & Dad — Build Plan & Progress

> **Living document.** This is the canonical plan and status tracker for the project.
> A new session (or a different machine) should read this first to know where to resume.
> Keep the **Current status** section up to date as stages complete.

---

## Current status — resume here

| Stage | Status |
| ----- | ------ |
| 1 · Scaffolding | ✅ done |
| 2 · Firebase + Auth | ✅ done & verified against live project |
| 3 · Groups & Accounts | ✅ implemented; build/lint/tests green. Pending the user's interactive CRUD check in their Google session |
| 4 · Transactions | ⬜ **next** |
| 5 · Recurring transactions | ⬜ |
| 6 · PWA polish + deploy | ⬜ |
| 7 · Native apps (Capacitor) | ⬜ optional |

**Next action:** once the user confirms Stage 3 works (create group → add account → balances/grouping correct), begin **Stage 4 (Transactions)**.

---

## What we're building

A small app that lets a **parent track transactions** (date, description, amount) on behalf of their
children, across multiple **accounts**. Accounts are **grouped** (typically one group per child).
**Recurring transactions** (e.g. weekly pocket money) credit accounts automatically on a schedule.

Runs in the browser, installs as a PWA on Android/iOS, hosted on Firebase. Native app-store builds
come later via Capacitor.

## Confirmed architecture decisions

- **Frontend:** React 18 + TypeScript + Vite, shipped as an installable **PWA** (`vite-plugin-pwa`).
  **Capacitor** added later (Stage 7) for native store builds — reuses the same web build + config.
- **Styling:** **Tailwind CSS** (utility-first).
- **Backend:** **Firebase** — Firestore + Auth. **No Cloud Functions** (stays on the free Spark plan).
- **Recurring transactions:** **client-side catch-up** on app open, made duplicate-safe with
  deterministic doc IDs (`${ruleId}_${dueDate}`). No server scheduler.
- **Auth:** **parents only.** Google + email/password. Data scoped to a shared **household**.
- **Money:** stored as **integer minor units (pence)**; single currency GBP for v1 (a `currency`
  code is stored per account for the future).

## Firebase project state

- **Project ID:** `bank-of-mum-and-dad-e8b28` (set as `default` in [`.firebaserc`](../.firebaserc)).
- **Auth providers enabled:** Google ✅. Email/Password ❌ (the sign-in form supports it; enable in
  the console if wanted — the UI shows a clear message when it's disabled).
- **Firestore:** database created; security rules in [`firestore.rules`](../firestore.rules) are
  **deployed** (household-scoped: users read their own profile; household data limited to members).
- **Config:** lives in git-ignored `.env.local` (keys documented in [`.env.example`](../.env.example)).
  These Firebase web keys are **not secret** — access is controlled by Auth + rules.

## Data model

Defined in [`src/types/models.ts`](../src/types/models.ts). Everything is nested under a household:

```
users/{uid}                         -> { householdId }                 (top-level)
households/{householdId}            -> { name, memberUids[], createdAt }
  groups/{groupId}                  -> { name, color?, sortOrder, createdAt }
  accounts/{accountId}              -> { name, groupId, currency, openingBalanceMinor, archived, createdAt }
  transactions/{txnId}              -> { accountId, date, description, amountMinor(±), source, recurringRuleId?, createdAt, createdByUid }
  recurringRules/{ruleId}           -> { accountId, description, amountMinor(±), interval, anchorDate, nextRunDate, lastRunDate?, active, createdAt }
```

- Balances are **computed client-side** (openingBalanceMinor + sum of transaction amounts).
- `createdAt` is stored as `Date.now()` (a number) to match the model — not a Firestore Timestamp.

## Stage detail

**Stage 1 — Scaffolding ✅** — Vite/React/TS, Tailwind, ESLint/Prettier, vite-plugin-pwa, folder
structure, `.gitignore`/`.gitattributes`/`.env.example`, Firebase config files.

**Stage 2 — Firebase + Auth ✅** — `src/firebase/config.ts` (Firestore offline persistence),
auth context + `AuthProvider`, `ensureHousehold` bootstrap on first login, `SignInPage`,
`ProtectedRoute`, household-scoped `firestore.rules`. Plus error surfacing
(`HouseholdErrorScreen`) and optional Seq logging (`src/lib/log.ts`, `VITE_SEQ_URL`).

**Stage 3 — Groups & Accounts ✅ (pending verify)** — `src/lib/money.ts` (+ tests),
`src/lib/firestore.ts`, generic `useCollection` hook, `useGroups`/`useAccounts` + CRUD APIs,
`GroupFormModal`/`AccountFormModal`, `Modal`, rebuilt `Dashboard` (grouped accounts, per-group
totals, empty/loading/error states). Balances show opening balance only until Stage 4.

**Stage 4 — Transactions ⬜ (next)** — add/edit/delete transactions (date, description, amount)
per account; transaction list view; balance = openingBalance + Σ transactions, computed live;
account/group totals updated to use it. New: `src/features/transactions/` (api, hook, form, list),
an account detail route, and `src/lib/dates.ts` if needed. No rules change (subcollection already
covered by the recursive member-only rule).

**Stage 5 — Recurring transactions ⬜** — recurring rule CRUD (pocket-money setup: amount +
interval + anchor date); client-side catch-up engine in `src/lib/recurring.ts` run on app load,
posting due transactions with deterministic IDs (idempotent across devices). Unit-test the engine.

**Stage 6 — PWA polish + deploy ⬜** — app icons + manifest, install prompt, offline check,
**code-split the Firebase bundle** (currently ~728 kB → chunk-size warning), add the Hosting domain
to Auth → authorized domains, `firebase deploy`.

**Stage 7 — Native apps ⬜ (optional)** — add Capacitor, generate Android/iOS projects from the web
build, configure store metadata.

## Conventions & workflow

- **Commit per stage** (and per meaningful follow-up) on `main`; messages end with the Co-Authored-By
  trailer. Each commit keeps build + lint + tests green.
- **Verify each stage** before building the next — the user tests interactively in their signed-in
  Google session; agent runs `build` / `lint` / `test` and a browser boot check.
- **Dev server:** `npm run dev` (Vite). Note it may land on `5174` if `5173` is busy; Firebase auth
  works on any localhost port.
- **Scripts:** `build` (tsc + vite), `lint`, `test` (Vitest), `format` (Prettier).
- **Logging:** use `src/lib/log.ts` (`logError`/`logWarning`/`logInfo`) — console + optional Seq.

## Deferred / future enhancements

- **Second-parent sharing:** first login creates a household owning just that user. An invite/join
  flow to add a second parent to an existing household is not built yet.
- **Cached balances** on accounts (only needed if transaction volume grows).
- **`signInWithRedirect`** fallback for mobile (currently popup-based Google sign-in).
