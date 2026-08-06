import { getLocale } from './i18n.js';
import { track } from './tracking.js';

const KEY = 'atlas-free-analysis-completed-at';
const DAY = 24 * 60 * 60 * 1000;
const $ = id => document.getElementById(id);
const copy = () => getLocale() === 'en' ? {
  plan:'Atlas Free', available:'1 full analysis available', used:'Full analysis used', badge:'FREE',
  limitTitle:'Your next free analysis is not available yet', limitCopy:h=>`You can analyze another idea in ${h}. Your current report remains available.`,
  limitButton:'Join Atlas Pro waitlist', title:'Turn this idea into a project',
  body:'Save the analysis, return with new evidence, compare progress and continue the validation plan with Atlas Pro.',
  features:['Saved projects','Progress history','Evidence reanalysis','Idea comparison'], email:'Your email', submit:'Join Atlas Pro', continue:'Continue with Free',
  success:'You are on the Atlas Pro waitlist.', error:'We could not save your request. Please try again.'
} : {
  plan:'Atlas Free', available:'1 análisis completo disponible', used:'Análisis completo utilizado', badge:'FREE',
  limitTitle:'Tu siguiente análisis gratuito aún no está disponible', limitCopy:h=>`Podrás analizar otra idea dentro de ${h}. Tu informe actual sigue disponible.`,
  limitButton:'Apuntarme a Atlas Pro', title:'Convierte esta idea en un proyecto',
  body:'Guarda el análisis, vuelve con nueva evidencia, compara la evolución y continúa el plan de validación con Atlas Pro.',
  features:['Proyectos guardados','Historial de evolución','Reanálisis de evidencia','Comparador de ideas'], email:'Tu correo', submit:'Apuntarme a Atlas Pro', continue:'Seguir con Free',
  success:'Ya estás en la lista de Atlas Pro.', error:'No pudimos guardar tu solicitud. Inténtalo de nuevo.'
};

function remaining(){const at=Number(localStorage.getItem(KEY)||0);return Math.max(0,DAY-(Date.now()-at));}
function duration(ms){const hours=Math.ceil(ms/3600000);return getLocale()==='en'?`${hours} hour${hours===1?'':'s'}`:`${hours} hora${hours===1?'':'s'}`;}
function limited(){return remaining()>0;}

const style=document.createElement('style');
style.textContent=`.free-plan-status{display:flex;justify-content:space-between;align-items:center;gap:14px;margin:-4px 0 22px;padding:13px 15px;border:1px solid rgba(91,201,255,.22);border-radius:15px;background:rgba(91,201,255,.055)}.free-plan-status div{display:grid;gap:3px}.free-plan-status strong{font-size:14px}.free-plan-status span{color:var(--muted);font-size:12px}.free-plan-status>span{color:var(--blue);font-weight:900;letter-spacing:.1em}.free-limit-card,.pro-upsell{margin-top:18px;padding:18px;border:1px solid rgba(122,140,255,.32);border-radius:17px;background:linear-gradient(145deg,rgba(18,31,54,.98),rgba(9,20,36,.98))}.free-limit-card p,.pro-upsell>p{color:var(--muted);line-height:1.55}.free-limit-card .secondary-button{width:100%}.pro-upsell h4{font-size:25px;margin:4px 0 8px}.pro-feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.pro-feature-grid button{border:1px solid var(--line);border-radius:12px;background:#081523;color:var(--text);padding:12px;text-align:left;font:inherit;cursor:pointer}.pro-feature-grid button:before{content:'✦';color:var(--blue);margin-right:8px}.pro-waitlist-form{display:grid;grid-template-columns:1fr auto;gap:8px}.pro-waitlist-form input{min-width:0;border:1px solid var(--line);border-radius:14px;background:#071321;color:var(--text);padding:14px;font:inherit}.pro-waitlist-form .button{padding:13px 17px}.free-limit-active textarea,.free-limit-active #start-button{display:none}.free-limit-active .free-limit-card{display:block!important}@media(max-width:580px){.pro-feature-grid,.pro-waitlist-form{grid-template-columns:1fr}.free-plan-status{align-items:flex-start}}@media print{.free-plan-status,.pro-upsell,.free-limit-card{display:none!important}}`;
document.head.appendChild(style);

function inject(){
  const app=document.querySelector('.app-card'); const progress=document.querySelector('.progress-row'); const start=$('start-view'); const report=$('report-view');
  if(!app||!progress||!start||!report||$('free-plan-status')) return;
  const status=document.createElement('div');status.id='free-plan-status';status.className='free-plan-status';status.innerHTML='<div><strong id="free-plan-name"></strong><span id="free-plan-copy"></span></div><span id="free-plan-badge"></span>';app.insertBefore(status,progress);
  const limit=document.createElement('div');limit.id='free-limit-card';limit.className='free-limit-card hidden';limit.innerHTML='<strong id="free-limit-title"></strong><p id="free-limit-copy"></p><button id="free-limit-pro" class="secondary-button" type="button"></button>';start.appendChild(limit);
  const upsell=document.createElement('section');upsell.id='pro-upsell';upsell.className='pro-upsell hidden';upsell.innerHTML='<p class="eyebrow">ATLAS PRO</p><h4 id="pro-upsell-title"></h4><p id="pro-upsell-copy"></p><div class="pro-feature-grid"><button type="button" data-pro-feature="projects"></button><button type="button" data-pro-feature="history"></button><button type="button" data-pro-feature="reanalyze"></button><button type="button" data-pro-feature="compare"></button></div><form id="pro-waitlist-form" class="pro-waitlist-form"><input id="pro-email" type="email" autocomplete="email" required><button class="button" type="submit" id="pro-submit"></button></form><p id="pro-message" class="helper"></p><button id="continue-free" class="text-button" type="button"></button>';
  report.insertBefore(upsell,report.querySelector('.report-actions'));
  $('free-limit-pro').addEventListener('click',()=>{track('pro_upsell_viewed',{source:'free_limit'});upsell.classList.remove('hidden');report.scrollIntoView({behavior:'smooth',block:'center'});});
  document.querySelectorAll('[data-pro-feature]').forEach(b=>b.addEventListener('click',()=>track('pro_feature_clicked',{feature:b.dataset.proFeature})));
  $('continue-free').addEventListener('click',()=>{upsell.classList.add('hidden');track('continue_free_clicked');});
  $('pro-waitlist-form').addEventListener('submit',submitWaitlist);
  refresh();
}

function refresh(){if(!$('free-plan-status'))return;const c=copy();$('free-plan-name').textContent=c.plan;$('free-plan-copy').textContent=limited()?c.used:c.available;$('free-plan-badge').textContent=c.badge;$('free-limit-title').textContent=c.limitTitle;$('free-limit-copy').textContent=c.limitCopy(duration(remaining()));$('free-limit-pro').textContent=c.limitButton;$('pro-upsell-title').textContent=c.title;$('pro-upsell-copy').textContent=c.body;document.querySelectorAll('[data-pro-feature]').forEach((b,i)=>b.textContent=c.features[i]);$('pro-email').placeholder=c.email;$('pro-submit').textContent=c.submit;$('continue-free').textContent=c.continue;document.querySelector('.app-card')?.classList.toggle('free-limit-active',limited()&&!$('start-view')?.classList.contains('hidden'));if(!limited())track('free_analysis_available');}

async function submitWaitlist(event){event.preventDefault();const c=copy();const email=$('pro-email').value.trim();$('pro-submit').disabled=true;try{const response=await fetch('/api/waitlist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,language:getLocale(),source:'report_free_upsell'})});if(!response.ok)throw new Error();$('pro-message').textContent=c.success;track('pro_waitlist_from_report');event.target.reset();}catch{$('pro-message').textContent=c.error;}finally{$('pro-submit').disabled=false;}}

function markCompleted(){if(limited())return;localStorage.setItem(KEY,String(Date.now()));track('free_analysis_consumed');refresh();}

inject();
let reportWasVisible=false;
const observer=new MutationObserver(()=>{const report=$('report-view');if(!report)return;const visible=!report.classList.contains('hidden');if(visible&&!reportWasVisible){const verdict=($('verdict')?.textContent||'').toLowerCase();const blocked=verdict.includes('no evaluable')||verdict.includes('not eligible');if(!blocked){markCompleted();$('pro-upsell')?.classList.remove('hidden');track('pro_upsell_viewed',{source:'report'});}}reportWasVisible=visible;refresh();});
observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true,characterData:true});
window.addEventListener('atlas:locale',refresh);
$('start-button')?.addEventListener('click',event=>{if(limited()){event.stopImmediatePropagation();document.querySelector('.app-card')?.classList.add('free-limit-active');track('free_limit_reached');}},true);
$('new-analysis-button')?.addEventListener('click',()=>setTimeout(()=>{if(limited()){document.querySelector('.app-card')?.classList.add('free-limit-active');track('free_limit_reached');}},0),true);
