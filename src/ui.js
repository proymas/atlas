import { byId, escapeHtml } from './dom.js';
import { VIEW_IDS } from './config.js';

let activeView='';
let displayedProgress=0;
let progressFrame=0;

function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;}

function animateProgress(target){
  cancelAnimationFrame(progressFrame);
  if(reducedMotion()){
    displayedProgress=target;
    byId('progress-label').textContent=`${Math.round(target)} %`;
    return;
  }
  const start=displayedProgress;
  const delta=target-start;
  const started=performance.now();
  const duration=Math.min(360,150+Math.abs(delta)*3);
  const tick=(now)=>{
    const p=Math.min(1,(now-started)/duration);
    const eased=1-Math.pow(1-p,3);
    displayedProgress=start+delta*eased;
    byId('progress-label').textContent=`${Math.round(displayedProgress)} %`;
    if(p<1)progressFrame=requestAnimationFrame(tick);
    else displayedProgress=target;
  };
  progressFrame=requestAnimationFrame(tick);
}

function keepActiveViewComfortable(next){
  if(!activeView||reducedMotion()||window.innerWidth>700)return;
  requestAnimationFrame(()=>{
    const card=next.closest('.app-card')||next;
    const rect=card.getBoundingClientRect();
    if(rect.top<105||rect.top>window.innerHeight*.48){
      card.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
}

export function showView(id) {
  VIEW_IDS.forEach((viewId) => {
    const view=byId(viewId);
    const visible=viewId===id;
    view.classList.toggle('hidden',!visible);
    view.setAttribute('aria-hidden',visible?'false':'true');
    if(!visible)view.classList.remove('view-enter');
  });
  const next=byId(id);
  if(activeView!==id){
    const hadView=Boolean(activeView);
    next.classList.remove('view-enter');
    requestAnimationFrame(()=>next.classList.add('view-enter'));
    if(hadView)keepActiveViewComfortable(next);
    activeView=id;
  }
}

export function setProgress(value, label) {
  const bounded=Math.max(0,Math.min(100,value));
  byId('progress-bar').style.width=`${bounded}%`;
  animateProgress(bounded);
  if(label)byId('step-label').textContent=label;
}

export function renderList(id, items) {
  const values=Array.isArray(items)?items:[];
  byId(id).innerHTML=values.length
    ? values.map((item)=>`<li>${escapeHtml(String(item))}</li>`).join('')
    : '<li>Sin datos suficientes.</li>';
}
