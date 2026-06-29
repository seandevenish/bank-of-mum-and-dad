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
| 3 · Groups & Accounts (incl. per-account currency) | ✅ done & verified |
| 4 · Transactions | ✅ done & verified |
| 5 · Recurring transactions | ✅ done (build/lint/test green; awaiting interactive verify) |
| 6 · Members, roles & invites (multi-parent) | ⬜ **next** |
| 7 · PWA polish + deploy | ⬜ |
| 8 · Native apps (Capacitor) | ⬜ optional |

**Next action:** verify Stage 5 interactively, then begin **Stage 6 (Members, roles & invites)**.

---

## What we're building

A small app that lets a **parent track transactions** (date, description, amount) on behalf of their
children, across multiple **accounts**. Accounts are **grouped** (typically one group per child).
**Recurring transactions** (e.g. weekly pocket money) credit accounts automatically on a schedule.
Multiple parents can share a space with **role-based permissions**.

Runs in the browser, installs as a PWA on Android/iOS, hosted on Firebase. Native app-store builds
come later via Capacitor.

## Confirmed architecture decisions

- **Frontend:** React 18 + TypeScript + Vite, installable **PWA** (`vite-plugin-pwa`). **Capacitor**
  later (Stage 8) for native store builds — reuses the same web build + config.
- **Styling:** **Tailwind CSS** (utility-first).
- **Backend:** **Firebase** — Firestore + Auth. **No Cloud Functions** (stays on the free Spark plan).
  All logic (incl. recurring catch-up and invite acceptance) runs client-side; security is enforced
  by Firestore rules.
- **Recurring transactions:** **client-side catch-up** on app open, made duplicate-safe with
  deterministic doc IDs (`${ruleId}_${dueDate}`).
- **Auth:** **parents only.** Google + email/password. Data scoped to a shared **household / space**.
- **Multi-member spaces with role-based permissions:** one **owner**, plus members with role
  **admin / full / read-only**, each optionally **scoped to specific groups**.
- **Invites:** **email-based with auto-join** — owner/admin records an invite for an email + role;
  when that person signs in with the matching email, the app joins them at the assigned role.
- **Money:** stored as **integer minor units (pence)**. **Currency is per account** (user-selectable,
  two-decimal currencies for now); totals are computed **per currency** (amounts in different
  currencies are never summed into one number).

## Firebase project state

- **Project ID:** `bank-of-mum-and-dad-e8b28` (set as `default` in [`.firebaserc`](../.firebaserc)).
- **Auth providers enabled:** Google ✅. Email/Password ❌ (the sign-in form supports it; enable in
  the console if wanted — the UI shows a clear message when it's disabled).
- **Firestore:** database created; rules in [`firestore.rules`](../firestore.rules) are **deployed**
  (currently household-member-scoped; Stage 6 makes them role + group aware — redeploy then).
- **Config:** git-ignored `.env.local` (keys documented in [`.env.example`](../.env.example)). The
  Firebase web keys are **not secret** — access is controlled by Auth + rules.

## Data model

Defined in [`src/types/models.ts`](../src/types/models.ts). Everything nests under a household.
Items marked **(Stage 6)** are added when multi-member support is built.

```
users/{uid}                 -> { householdId }                                    (top-level)
households/{householdId}     -> { name, ownerUid (S6), memberUids[], createdAt }
  members/{uid}     (S6)     -> { uid, role: owner|admin|full|readonly,
                                   scopedGroupIds: string[] | null,   // null = all groups
                                   email, displayName, invitedByUid?, joinedAt }
  invites/{emailKey} (S6)    -> { email, role, scopedGroupIds, householdId, householdName,
                                   invitedByUid, createdAt, status: 'pending' }
  groups/{groupId}           -> { name, color?, sortOrder, createdAt }
  accounts/{accountId}       -> { name, groupId, currency, openingBalanceMinor, archived, createdAt }
  transactions/{txnId}       -> { accountId, groupId (S6, denormalised), date, description,
                                   amountMinor(±), source, recurringRuleId?, createdAt, createdByUid }
  recurringRules/{ruleId}    -> { accountId, groupId (S6, denormalised), description, amountMinor(±),
                                   interval, anchorDate, nextRunDate, lastRunDate?, active, createdAt }
```

- Balances are **computed client-side** (openingBalanceMinor + Σ transaction amounts), per currency.
- `createdAt` is `Date.now()` (a number) to match the model — not a Firestore Timestamp.
- **`memberUids[]`** is a denormalised list of all member uids for fast rule checks; **`members/{uid}`**
  holds the role + scope detail.
- **`groupId` is denormalised onto transactions/recurringRules (Stage 6)** so group-scoped rules can
  check access without an extra account lookup.

## Stage detail

**Stage 1 — Scaffolding ✅** — Vite/React/TS, Tailwind, ESLint/Prettier, vite-plugin-pwa, folder
structure, ignore/attributes/env files, Firebase config files.

**Stage 2 — Firebase + Auth ✅** — `firebase/config.ts` (Firestore offline persistence), auth context
+ `AuthProvider`, `ensureHousehold` bootstrap, `SignInPage`, `ProtectedRoute`, household-scoped rules.
Plus error surfacing (`HouseholdErrorScreen`) and optional Seq logging (`src/lib/log.ts`).

**Stage 3 — Groups & Accounts ✅** — `money.ts` (+ tests), `firestore.ts`, generic `useCollection`,
`useGroups`/`useAccounts` + CRUD, `GroupFormModal`/`AccountFormModal`, `Modal`, rebuilt `Dashboard`
(grouped accounts, per-group totals, empty/loading/error states). **Per-account currency**
(`src/lib/currencies.ts`) with **currency-aware group subtotals**. Balances show opening balance
only until Stage 4.

**Stage 4 — Transactions ✅** — add/edit/delete transactions (date, description, amount) per account
via an account-detail route (`/accounts/:accountId`). `src/features/transactions/` holds `api.ts`,
`useTransactions` (one household-wide subscription ordered by `date desc`, derived per-account
client-side — no composite index), `balances.ts` (+ tests), `TransactionFormModal` (Money in/out
toggle), `TransactionList` (running balance per row). `src/lib/dates.ts` added (`todayIso`,
`formatIsoDate`, local-tz safe). Dashboard now shows live balances (opening + Σ txns) per account and
in per-group/per-currency totals, with account rows linking to the detail page. No rules change
(subcollection covered by the `{document=**}` wildcard).

**Stage 5 — Recurring transactions ✅** — `src/lib/recurring.ts` (+ tests): pure, tz-safe scheduling
(`computeDueDates`, `nextOccurrence`; monthly preserves the anchor day with no drift; backlog capped
at `MAX_CATCHUP_POSTS` = 366). `src/features/recurring/`: `api.ts` (CRUD + `runRecurringCatchUp`,
which batches due posts with deterministic ids `${ruleId}_${date}` and advances `nextRunDate`/
`lastRunDate` — idempotent across devices), `useRecurringRules`, `RecurringRuleFormModal` (Money
in/out, interval, start date; runs an immediate catch-up on create so back-dated rules post at once),
`RecurringRulesList` (pause/resume/edit/delete, shows next run date), and `RecurringCatchUp` (mounted
once in `App` inside `AuthProvider`; reads rules once on load and posts anything due). Account-detail
page gained a "Recurring" section above the transaction list. Recurring posts carry
`source: 'recurring'` (badged in the list) and roll into balances like any transaction. No rules
change. **Note:** `groupId` is *not yet* denormalised onto transactions/rules — that's added in
Stage 6 when rules become group-scope-aware.

**Stage 6 — Members, roles & invites ⬜** — multi-parent sharing with role-based permissions.
- **Roles:** **Owner** (creator; full control incl. delete space + manage all members; exactly one),
  **Admin** (manage members + full data access), **Full** (create/edit/delete all data, can't manage
  members), **Read-only** (view only). **Optional per-group scoping** (`scopedGroupIds`) limits a
  member to specific groups/children.
- **Invite flow (email, auto-join):** owner/admin records an invite (`invites/{emailKey}`) for an
  email + role + optional scope. On sign-in, the app runs a `collectionGroup('invites')` query where
  `email == auth.email` to discover pending invites and prompt to accept. **Accept** = one batched
  write: `arrayUnion(uid)` into `memberUids`, create `members/{uid}` from the invite, delete the invite.
- **Rules (the hard part — redeploy):** members readable by members, writable by owner/admin; invites
  creatable/deletable by owner/admin, readable by the addressed email (for discovery); household
  `memberUids` updatable by owner/admin **or** self-join when a matching pending invite exists
  (checked via `exists()` on the email-keyed invite path); data reads/writes become role-aware
  (read-only can't write) and scope-aware (scoped members limited to their `groupId`s — hence the
  denormalised `groupId`).
- **Migration:** backfill `ownerUid` + an owner `members/{uid}` doc for the existing household;
  `ensureHousehold` sets these for new households going forward.
- **UI:** a members/settings screen (list members with role badges, invite form, change role, remove);
  an invite-accept prompt after sign-in.
- **Suggested build order within the stage:** model + owner self-membership → invite create/accept →
  role enforcement in rules + UI gating → per-group scoping last.

**Stage 7 — PWA polish + deploy ⬜** — app icons + manifest, install prompt, offline check,
**code-split the Firebase bundle** (currently ~729 kB → chunk-size warning), add the Hosting domain to
Auth → authorized domains, `firebase deploy`.

**Stage 8 — Native apps ⬜ (optional)** — add Capacitor, generate Android/iOS projects from the web
build, configure store metadata.

## Conventions & workflow

- **Commit per stage** (and per meaningful follow-up) on `main`; messages end with the Co-Authored-By
  trailer. Each commit keeps build + lint + tests green.
- **Verify each stage** before building the next — the user tests interactively in their signed-in
  Google session; agent runs `build` / `lint` / `test` and a browser boot check.
- **Dev server:** `npm run dev` (Vite). May land on `5174` if `5173` is busy; Firebase auth works on
  any localhost port.
- **Scripts:** `build` (tsc + vite), `lint`, `test` (Vitest), `format` (Prettier).
- **Logging:** use `src/lib/log.ts` (`logError`/`logWarning`/`logInfo`) — console + optional Seq.

## Deferred / future enhancements

- **Zero/three-decimal currencies** (e.g. JPY): the minor-unit scale is fixed at 2dp; supporting
  others needs a per-currency scale.
- **Cached balances** on accounts (only if transaction volume grows large).
- **`signInWithRedirect`** fallback for mobile (currently popup-based Google sign-in).
- **Cross-currency grand total** (would need exchange rates) — intentionally not done; totals stay
  per currency.
