# Atlas

Atlas is a business-validation workspace that turns an idea into a structured diagnosis and then keeps the project moving through evidence, experiments, reanalysis, version comparison and contextual Copilot guidance.

## Current version

**Atlas Beta 3.4 — Free + Pro continuity architecture**

GitHub is the source of truth. Production is deployed from `main` to Vercel at `https://atlas-beta-2.vercel.app`.

## Product model

Atlas Free is deliberately useful: a user can validate an idea, save a project and begin gathering evidence. Atlas Pro monetizes continuity and depth rather than basic account/cloud access.

Current Pro capabilities include broader project/evidence/experiment/reanalysis/Copilot usage, complete version comparison/history and premium PDF output. Subscription billing is handled through Stripe Checkout and signed subscription webhooks.

## Architecture

```text
atlas/
├── index.html
├── assets/                 # design tokens, application, landing and print CSS
├── src/
│   ├── app.js              # validator bootstrap
│   ├── auth.js             # account/session lifecycle
│   ├── workspace.js        # project workspace
│   ├── cloud-projects.js   # authenticated cloud reconciliation
│   ├── entitlements.js     # Free/Pro state
│   ├── plan-gating.js      # natural upgrade boundaries
│   ├── billing-client.js   # Checkout / Billing Portal
│   └── ...                 # evidence, experiments, reanalysis, compare, Copilot
├── api/
│   ├── analyze-safe-v3.js  # public safety-checked analysis route target
│   ├── analyze.js          # internal calibrated analysis engine
│   ├── projects.js         # project + entitlement bridge
│   ├── billing.js          # Stripe Checkout / portal / webhook
│   ├── copilot.js
│   ├── report-pdf.js
│   └── ...
├── scripts/
│   └── architecture-smoke.mjs
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_CONTRACTS.md
└── vercel.json
```

See `docs/ARCHITECTURE.md` for the current persistence, Supabase and billing model.

## Infrastructure

- **GitHub:** source control and automated quality checks.
- **Vercel:** production frontend and serverless API.
- **Supabase:** authentication/data bridge, cloud projects, entitlements and feature usage.
- **Stripe:** Atlas Pro monthly/annual subscriptions, Checkout, Billing Portal and webhooks.

TEST and LIVE Stripe configurations are isolated. Billing defaults to LIVE; TEST requires explicit environment configuration and separate Stripe keys/prices/webhook metadata.

## Product principles

1. Atlas does not predict success.
2. Safety and legality are evaluated before commercial potential.
3. Facts, assumptions and missing evidence must remain distinguishable.
4. Every report must end with a cheap, measurable next action.
5. Account creation and basic cloud synchronization remain free.
6. Private credentials never belong in frontend code or GitHub.
7. Entitlements are decided server-side; the browser cannot grant itself Pro access.

## Development quality gate

Run:

```bash
npm run check
```

The smoke suite verifies JavaScript syntax, relative imports, critical billing invariants, removal of the legacy waitlist and the Vercel Serverless Function budget. GitHub Actions runs the same check on pushes and pull requests to `main`.

## Session close routine

Before considering a development session stable:

1. confirm the latest Vercel production deployment is READY;
2. run/confirm the GitHub quality workflow;
3. inspect recent Vercel runtime errors;
4. review Supabase security/performance advisors after schema changes;
5. manually smoke-test the user journeys changed during the session.
