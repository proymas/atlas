# Incident — Beta 3.0 analyze contract mismatch

## Symptom

The production validator returned `Modo inválido` immediately after submitting a valid idea.

## Root cause

The browser application sends a stable public contract using `stage` values (`screen` and `report`). The upstream analysis engine expects a field named `mode`. The Vercel proxy forwarded the request body unchanged, so the upstream engine received no valid mode.

## Resolution

Translate the public `stage` contract to the upstream `mode` contract at `api/analyze.js`:

- `screen` → `questions`
- `report` → `report`

The proxy now owns this compatibility boundary, keeping the frontend independent from the implementation details of the remote analysis engine.

## Prevention

- Validate required request fields before forwarding.
- Document frontend-to-proxy and proxy-to-upstream contracts.
- Test the principal validation journey after every production deployment.
