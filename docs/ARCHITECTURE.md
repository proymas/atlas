# Atlas — Current Architecture

GitHub (`proymas/atlas`, branch `main`) is the source of truth. Vercel deploys the browser application and the serverless API. Supabase provides authentication/data services and Stripe provides subscription billing.

## Browser application

- `src/app.js`: validator flow bootstrap and primary UI actions.
- `src/auth.js`: account/session lifecycle.
- `src/workspace.js`: local project workspace and cloud reconciliation.
- `src/cloud-projects.js`: authenticated cloud project client.
- `src/entitlements.js`: browser-side Free/Pro state and limits.
- `src/plan-gating.js`: natural Free → Pro boundaries.
- `src/upgrade-page.js`: Atlas Pro pricing/upgrade experience.
- `src/billing-client.js`: Checkout and Billing Portal redirects.
- `src/reanalysis-v2.js`, `src/version-compare.js`, `src/experiment-lab.js`, `src/copilot.js`: continuity features.
- `src/history-pdf-gating.js`: history/PDF plan behavior.
- `src/free-stable.js`: temporary compatibility facade only; legacy waitlist/analysis-limit behavior has been removed.

## Serverless API (Vercel)

- `/api/analyze` → `api/analyze-safe-v3.js`: screening/questions/report generation.
- `api/auth-config.js`: exposes only the publishable Supabase auth configuration required by the browser.
- `api/projects.js`: authenticated bridge for project sync and entitlements usage.
- `api/billing.js`: Stripe Checkout, Billing Portal and signed subscription webhooks. Billing defaults to LIVE and TEST must be explicitly selected with `ATLAS_BILLING_MODE=test`.
- `api/copilot.js`: Copilot backend.
- `api/report-pdf.js`: server-side PDF generation and Pro verification.
- `api/delete-account.js`: authenticated account deletion flow.
- `api/event.js`, `api/feedback.js`, `api/metrics.js`: product telemetry/feedback/metrics.

Vercel Hobby has a limited Serverless Function budget. Superseded API files must be removed rather than kept indefinitely.

## Supabase

Current data project: `ntrnchrtnfjyrsagxxbo`.

Core tables:
- `public.atlas_projects`: project cloud persistence, RLS enabled.
- `public.atlas_user_plans`: plan/usage compatibility and audit state, server-managed.
- `public.atlas_feature_usage`: metered feature usage, server-managed.

Edge functions:
- `atlas-projects-bridge`: validates the Atlas auth token and performs user-scoped project operations with the service role.
- `atlas-entitlements`: resolves the active plan and consumes/refunds metered Copilot usage.

### Billing source of truth

Stripe subscription webhooks write LIVE billing state to Supabase Auth `app_metadata.atlas_billing`. TEST billing uses the isolated key `app_metadata.atlas_test_billing`. The entitlement bridge prefers Stripe-backed Auth metadata when present and otherwise falls back to `atlas_user_plans` for compatibility. TEST and LIVE must never share Stripe keys, price IDs, webhook secrets or metadata keys.

## Persistence model

Guest projects live in `localStorage`. Signed-in users reconcile local projects with cloud projects. Reconciliation uses project IDs and `updatedAt`; only local versions newer than their cloud counterpart should be written back.

## Security invariants

1. Service-role and Stripe secret keys never enter frontend files or GitHub.
2. Publishable/anon auth keys may be exposed only where required for client/Auth token validation; secret keys may not.
3. Every cloud project operation is scoped to the authenticated user.
4. Stripe webhook signatures and `event.livemode` must be verified before changing an entitlement.
5. TEST billing must require explicit TEST configuration and must not affect LIVE entitlements.
6. `atlas_user_plans` and `atlas_feature_usage` are server-managed; their RLS-with-no-client-policy state is intentional unless the persistence model changes.
7. Production changes come from `main`; experimental billing work stays in Preview branches until merged deliberately.

## Quality gates

Run `npm run check` after architecture changes. It performs JavaScript syntax checks, verifies critical billing/waitlist invariants, and guards the Vercel function budget.

After every work session, review Vercel runtime errors and Supabase security/performance advisors before declaring the build stable.
