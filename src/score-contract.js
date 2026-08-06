import { state } from './state.js';

const clamp20=value=>Math.max(0,Math.min(20,Math.round(Number(value)||0)));

function values(report={}){
  const raw=report.scoreBreakdown||report.scoring||{};
  return [
    clamp20(raw.problemEvidence??raw.offerClarity),
    clamp20(raw.customerSpecificity??raw.customerProblemFit),
    clamp20(raw.paymentEvidence??raw.economicPlausibility),
    clamp20(raw.distributionFeasibility),
    clamp20(raw.deliveryEconomics??raw.validationReadiness)
  ];
}

export function repairScoreContract(report=state.report||{}){
  const card=document.querySelector('#atlas-33-insights .score-breakdown');
  if(!card)return;
  const outputs=[...card.querySelectorAll('.score-row strong')];
  if(outputs.length!==5)return;
  values(report).forEach((value,index)=>{outputs[index].textContent=`${value}/20`;});
  card.dataset.scoreContract='atlas-evidence-v2';
}

function schedule(){queueMicrotask(()=>repairScoreContract());}

const reportView=document.getElementById('report-view');
if(reportView){
  const observer=new MutationObserver(schedule);
  observer.observe(reportView,{childList:true,subtree:true});
}

document.addEventListener('click',event=>{
  if(event.target.closest('[data-action="open"],#answer-button,.workspace-open'))setTimeout(schedule,0);
});
window.addEventListener('atlas:locale',schedule);
schedule();
