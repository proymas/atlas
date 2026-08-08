// Legacy compatibility facade.
// Free/Pro limits are enforced centrally by entitlements + plan-gating.
// Keeping these exports avoids coupling the analysis flow to monetization details.

export function isFreeLimited(){return false;}

export function initFreePlan(){
  // Intentionally empty. The old Beta analysis-limit/waitlist UI was retired
  // when Atlas Pro billing and entitlement gating became the source of truth.
}

export function guardFreeStart(){
  // Project creation limits are intercepted by plan-gating.js using live entitlements.
  return true;
}

export function completeFreeAnalysis(){
  // No legacy waitlist/upsell side effects. Upgrade prompts now come from natural
  // entitlement boundaries (projects, evidence, experiments, reanalysis, Copilot).
}

export function resetFreeView(){
  // Kept for app.js API compatibility during the architecture cleanup.
}
