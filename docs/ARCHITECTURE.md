# Atlas Beta 3.0 — Architecture

GitHub is the single source of truth. Vercel deploys the repository and the `api/` directory remains independent from the browser application.

## Frontend

- `src/app.js`: application entrypoint and event binding.
- `src/config.js`: version and stable product configuration.
- `src/state.js`: central in-memory validator state.
- `src/api.js`: HTTP client for serverless APIs.
- `src/dom.js`: safe DOM and text utilities.
- `src/ui.js`: view, progress and list rendering.
- `src/report.js`: report rendering.
- `src/tracking.js`: product events.

## Styles

- `assets/tokens.css`: design tokens and shared visual constants.
- `assets/styles.css`: current layout and components. Beta 3.1 may split this further by landing component without changing product logic.

## APIs

- `api/analyze.js`: screening, questions and report generation.
- `api/event.js`: product events.
- `api/feedback.js`: feedback collection.

## Rules

1. No credentials in frontend files or GitHub.
2. Product logic and presentation must remain separable.
3. APIs stay independently deployable and testable.
4. New versions are developed in branches and reviewed before merging into `main`.
5. Atlas is not launched publicly before Beta 3.4 is complete.
