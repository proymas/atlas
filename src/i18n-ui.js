import { initProjectMemory } from './project-memory.js';
import { state } from './state.js';

const style = document.createElement('style');
style.textContent = `.nav-actions{display:flex;align-items:center;gap:14px}.language-switcher{display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid var(--line-soft);border-radius:999px;background:rgba(5,13,25,.65);font-size:11px;font-weight:900;letter-spacing:.08em}.language-switcher button{appearance:none;border:0;background:transparent;color:var(--muted);padding:4px 5px;cursor:pointer;font:inherit;transition:color .2s}.language-switcher button[aria-pressed="true"]{color:var(--blue)}.language-switcher button:hover,.language-switcher button:focus-visible{color:var(--text)}.language-switcher button:focus-visible{outline:2px solid var(--blue);outline-offset:2px}.language-switcher span{color:var(--line)}@media(max-width:760px){.nav nav{display:none}.nav-actions{gap:8px}.language-switcher{padding:4px 6px}.nav-actions .button-small{padding-left:12px;padding-right:12px}}@media(max-width:430px){.nav-actions .button-small{display:none}}`;
document.head.appendChild(style);

const clamp20=value=>Math.max(0,Math.min(20,Math.round(Number(value)||0)));
function visibleBreakdown(report={}){
  const raw=report.scoreBreakdown||report.scoring||{};
  return [
    clamp20(raw.problemEvidence??raw.offerClarity),
    clamp20(raw.customerSpecificity??raw.customerProblemFit),
    clamp20(raw.paymentEvidence??raw.economicPlausibility),
    clamp20(raw.distributionFeasibility),
    clamp20(raw.deliveryEconomics??raw.validationReadiness)
  ];
}
function repairEvidenceScore(){
  const card=document.querySelector('#atlas-33-insights .score-breakdown');
  if(!card)return;
  const values=visibleBreakdown(state.report||{});
  const outputs=[...card.querySelectorAll('.score-row strong')];
  if(outputs.length!==5)return;
  outputs.forEach((output,index)=>{output.textContent=`${values[index]}/20`;});
  card.dataset.scoreContract='atlas-evidence-v2';
}
const scoreObserver=new MutationObserver(repairEvidenceScore);
scoreObserver.observe(document.body,{childList:true,subtree:true});
window.addEventListener('atlas:locale',()=>queueMicrotask(repairEvidenceScore));
window.addEventListener('atlas:memory-synced',()=>queueMicrotask(repairEvidenceScore));

initProjectMemory();
repairEvidenceScore();
