# Atlas API contracts

## Browser → `/api/analyze`

Vercel routes `/api/analyze` to `api/analyze-safe-v3.js`. Browser code must depend only on this public route, never on the implementation filename.

### Screening and question generation

```json
{
  "stage": "screen",
  "idea": "...",
  "language": "es",
  "locale": "es"
}
```

### Final report

```json
{
  "stage": "report",
  "idea": "...",
  "answers": [],
  "language": "es",
  "locale": "es"
}
```

Reanalysis may send the equivalent report request through the same route. The endpoint owns translation/normalization required by the analysis engine.

## Browser → `/api/projects`

Requires `Authorization: Bearer <access_token>`.

- `GET /api/projects`: list the authenticated user's projects.
- `POST /api/projects`: upsert `{ "project": { ... } }`.
- `DELETE /api/projects`: delete `{ "clientId": "..." }`.
- `GET /api/projects?mode=entitlements`: resolve current Free/Pro entitlement.
- `POST /api/projects?mode=consume-copilot`: atomically consume a Free Copilot allowance.

The browser must never send or receive a Supabase service-role key.

## Browser / Stripe → `/api/billing`

Billing is disabled unless `ATLAS_BILLING_ENABLED=true`.

Authenticated browser requests:

```json
{ "billing": "monthly" }
```

or

```json
{ "billing": "annual" }
```

return a Stripe Checkout URL. `{ "action": "portal" }` returns a Stripe Billing Portal URL for an existing billing customer.

Stripe webhooks use the same endpoint and are distinguished by `stripe-signature`. The endpoint must verify the signing secret and reject a TEST/LIVE mode mismatch before mutating entitlement state.

LIVE is the default billing mode. TEST requires `ATLAS_BILLING_MODE=test` and separate TEST keys, prices, webhook secret and Auth metadata.

## Browser → `/api/report-pdf`

`POST` with the current idea/report and optional authenticated bearer token. Premium output is authorized server-side; the browser's requested tier is not trusted as proof of Pro entitlement.

## Error contract

API clients should treat non-2xx responses as failures and prefer the JSON `error` code when present. User-visible frontend text should remain localized and must not expose secret configuration or raw upstream credentials.
