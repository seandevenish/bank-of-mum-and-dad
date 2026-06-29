# Bank of Mum & Dad

A small app that lets a parent track transactions (date, description, amount) on behalf of their
children, across multiple **accounts**. Accounts can be **grouped** (typically one group per child),
and **recurring transactions** (e.g. weekly pocket money) credit accounts automatically on a
schedule.

It runs in the browser, installs as a PWA on Android and iOS, and is hosted on Firebase. Native
app-store builds can be produced later via Capacitor.

## Tech stack

| Concern        | Choice                                                        |
| -------------- | ------------------------------------------------------------- |
| UI             | React + TypeScript + Vite                                     |
| Styling        | Tailwind CSS                                                  |
| Installable    | PWA (`vite-plugin-pwa`); Capacitor later for native builds    |
| Auth           | Firebase Auth (Google + email/password) — parents only        |
| Database       | Cloud Firestore (offline persistence enabled)                 |
| Recurring txns | Client-side catch-up engine (free Spark plan, no Cloud Funcs) |
| Hosting        | Firebase Hosting                                              |

## Getting started

```bash
npm install            # install dependencies
cp .env.example .env.local   # then fill in your Firebase web config
npm run dev            # start the dev server
```

Open the printed local URL in your browser.

### Firebase config

The values in `.env.local` come from your Firebase project (console → Project settings → General →
Your apps → SDK setup & configuration). They are **not secret** — Firebase ships them to the client
by design; access is controlled by Firebase Auth and Firestore Security Rules. `.env.local` is
git-ignored; `.env.example` documents the required keys.

## Scripts

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Start the Vite dev server                |
| `npm run build`  | Type-check and build for production      |
| `npm run preview`| Preview the production build locally     |
| `npm run lint`   | Run ESLint                               |
| `npm run format` | Format with Prettier                     |
| `npm run test`   | Run unit tests (Vitest)                  |

## Project structure

```
src/
  firebase/      Firebase initialisation (Stage 2)
  routes/        Route definitions / pages
  features/
    auth/        Sign-in, auth context, household bootstrap
    groups/      Group (child) management
    accounts/    Account management + balances
    transactions/Transaction list + add/edit
    recurring/   Recurring rules + catch-up engine
  components/    Shared UI
  hooks/         Firestore listener hooks
  lib/           money / date / recurring helpers
  types/         Shared data-model types (models.ts)
```

## Build plan & progress

The canonical, living plan — architecture decisions, Firebase setup state, stage-by-stage
status, and conventions — is in **[`docs/PLAN.md`](docs/PLAN.md)**. Start there to see what's
done and what's next.

Stages: 1 Scaffolding → 2 Firebase + Auth → 3 Groups & Accounts → 4 Transactions →
5 Recurring transactions → 6 PWA polish + deploy → 7 Native apps (optional).

See the data model in [`src/types/models.ts`](src/types/models.ts).
