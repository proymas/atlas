import './reanalysis-v2.js';
import './version-compare.js';
import './copilot.js';
import './experiment-lab.js';
import './workspace-rerender-hook.js';
import './auth.js';
import './entitlements.js';
import './plan-gating.js';
import './auth-cloud-isolation.js';
import './password-recovery.js';
import './delete-account.js';

const style = document.createElement('style');
style.textContent = `.nav-actions{display:flex;align-items:center;gap:14px}.language-switcher{display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid var(--line-soft);border-radius:999px;background:rgba(5,13,25,.65);font-size:11px;font-weight:900;letter-spacing:.08em}.language-switcher button{appearance:none;border:0;background:transparent;color:var(--muted);padding:4px 5px;cursor:pointer;font:inherit;transition:color .2s}.language-switcher button[aria-pressed="true"]{color:var(--blue)}.language-switcher button:hover,.language-switcher button:focus-visible{color:var(--text)}.language-switcher button:focus-visible{outline:2px solid var(--blue);outline-offset:2px}.language-switcher span{color:var(--line)}#atlas-33-insights>.atlas-33-card:first-child{display:none}#atlas-33-insights:has(>.atlas-33-card:first-child:last-child){display:none}@media(max-width:760px){.nav nav{display:none}.nav-actions{gap:8px}.language-switcher{padding:4px 6px}.nav-actions .button-small{padding-left:12px;padding-right:12px}}@media(max-width:430px){.nav-actions .button-small{display:none}}`;
document.head.appendChild(style);
