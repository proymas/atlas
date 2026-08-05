# Atlas

Atlas is a business-idea validation product that turns a vague concept into assumptions, risks, a reasoned verdict and a measurable seven-day experiment.

## Current version

**Atlas Beta 3.0 — centralized architecture**

This repository is now the single source of truth for the product code. Production deployments should be generated from the `main` branch.

## Architecture

```text
atlas/
├── index.html          # application shell and semantic content
├── assets/
│   └── styles.css      # design system and responsive layout
├── src/
│   └── app.js          # state, validator flow and report rendering
├── api/
│   ├── analyze.js      # protected analysis proxy
│   ├── feedback.js     # beta feedback endpoint
│   └── event.js        # lightweight product analytics
└── vercel.json         # Vercel functions and SPA routing
```

## Release roadmap

- **3.0** Centralize and reorganize the full product.
- **3.1** Premium landing and product experience.
- **3.2** Spanish/English selector and complete localization.
- **3.3** Improve the AI analysis, safety and structured outputs.
- **3.4** Analytics dashboard and funnel visibility.
- **Launch gate** Publish on Reddit only after 3.0–3.4 pass acceptance tests.

## Product principles

1. Atlas does not predict success.
2. Safety and legality are evaluated before commercial potential.
3. Facts, assumptions and missing evidence must remain distinguishable.
4. Every report must end with a cheap and measurable next action.
5. No private API key may appear in frontend code or repository files.

## Deployment

1. Import `proymas/atlas` into Vercel.
2. Use `main` as the production branch.
3. Preserve all private provider credentials as Vercel environment variables.
4. Verify `/api/analyze`, `/api/feedback` and `/api/event` after each production deployment.

## Beta 3.0 acceptance criteria

- One repository and one production project.
- Landing, validator, report and APIs deployed together.
- Responsive flow on mobile and desktop.
- Clear error states and restart capability.
- Product events recorded without blocking the user.
- No critical known failure in the principal validation journey.
