import { getLocale } from './i18n.js';

const STORAGE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';
let initialized=false;
let upgradeSource='project_limit';

const copy=()=>getLocale()==='en'?{
  free:'FREE',pro:'PRO',close:'Not now',cta:'Explore Atlas Pro',
  projectTitle:'Your Free plan includes one active project',
  projectBody:'Atlas Free is designed to help you validate one project seriously. Keep working on your current project, or upgrade to Pro to build and compare multiple projects over time.',
  evidenceTitle:'Your project is already building real evidence',
  evidenceBody:'Atlas Free includes up to 5 evidence items per project. You can keep editing or removing the evidence you already have. Atlas Pro unlocks a deeper evidence history so your project can keep learning over time.'
}:{
  free:'FREE',pro:'PRO',close:'Ahora no',cta:'Explorar Atlas Pro',
  projectTitle:'Tu plan Free incluye un proyecto activo',
  projectBody:'Atlas Free está pensado para ayudarte a validar un proyecto en serio. Sigue trabajando en tu proyecto actual o pasa a Pro para construir y comparar varios proyectos a lo largo del tiempo.',
  evidenceTitle:'Tu proyecto ya está acumulando evidencia real',
  evidenceBody:'Atlas Free incluye hasta 5 evidencias por proyecto. Puedes seguir editando o eliminando las evidencias que ya tienes. Atlas Pro desbloquea un historial de evidencia más profundo para que tu proyecto siga aprendiendo con el tiempo.'
};

function plan(){return window.AtlasEntitlements?.getPlan?.()==='pro'?'pro':'free';}
function limits(){return window.AtlasEntitlements?.getLimits?.()||{activeProjects:1,evidencePerProject:5};}
function readProjects(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function isNewProjectAttempt(){return !localStorage.getItem(ACTIVE_KEY)&&readProjects().length>=1;}
function shouldBlockProject(){return plan()==='free'&&isNewProjectAttempt();}
function evidenceCount(){return document.querySelectorAll('#workspace-list .workspace-evidence-card').length;}
function isNewEvidenceForm(form){return !!form&&!String(form.dataset.evidenceId||'').trim();}
function shouldBlockEvidence(){const max=Number(limits().evidencePerProject??5);return plan()==='free'&&Number.isFinite(max)&&evidenceCount()>=max;}

function styles(){if(document.getElementById('atlas-plan-gating-styles'))return;const style=document.createElement('style');style.id='atlas-plan-gating-styles';style.textContent=`.atlas-plan-badge{display:inline-flex;align-items:center;justify-content:center;min-width:48px;height:28px;padding:0 10px;border:1px solid rgba(91,201,255,.35);border-radius:999px;background:rgba(91,201,255,.08);color:var(--blue);font-size:10px;font-weight:900;letter-spacing:.09em}.atlas-plan-badge[data-plan="pro"]{border-color:rgba(98,214,156,.45);background:rgba(98,214,156,.09);color:#62d69c}.atlas-upgrade-modal{position:fixed;inset:0;z-index:1700;display:grid;place-items:center;padding:18px;background:rgba(2,7,15,.82);backdrop-filter:blur(14px)}.atlas-upgrade-modal.hidden{display:none}.atlas-upgrade-card{width:min(520px,100%);border:1px solid rgba(91,201,255,.3);border-radius:24px;background:linear-gradient(150deg,#102039,#071321);box-shadow:0 35px 110px rgba(0,0,0,.6);padding:26px}.atlas-upgrade-card h2{margin:6px 0 10px;font-size:28px}.atlas-upgrade-card p{color:var(--muted);line-height:1.6}.atlas-upgrade-actions{display:flex;gap:9px;justify-content:flex-end;margin-top:20px}.atlas-upgrade-actions button{border:1px solid var(--line);border-radius:11px;background:#0d1d31;color:var(--text);padding:11px 14px;cursor:pointer}.atlas-upgrade-actions .primary{border-color:rgba(91,201,255,.5);background:rgba(91,201,255,.13);font-weight:850}@media(max-width:700px){.atlas-plan-badge{height:26px;min-width:42px;padding:0 8px}.atlas-upgrade-actions{display:grid;grid-template-columns:1fr}.atlas-upgrade-card{padding:20px}}`;document.head.appendChild(style);}

function modal(){let root=document.getElementById('atlas-upgrade-modal');if(root)return root;root=document.createElement('div');root.id='atlas-upgrade-modal';root.className='atlas-upgrade-modal hidden';root.innerHTML='<section class="atlas-upgrade-card" role="dialog" aria-modal="true"><p class="eyebrow">ATLAS PRO</p><h2 data-upgrade-title></h2><p data-upgrade-body></p><div class="atlas-upgrade-actions"><button type="button" data-upgrade-close></button><button class="primary" type="button" data-upgrade-cta></button></div></section>';document.body.appendChild(root);root.addEventListener('click',event=>{if(event.target===root||event.target.closest('[data-upgrade-close]'))closeModal();});root.querySelector('[data-upgrade-cta]')?.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('atlas:upgrade-intent',{detail:{source:upgradeSource}}));closeModal();});return root;}
function renderModal(){const c=copy(),root=modal(),evidence=upgradeSource==='evidence_limit';root.querySelector('[data-upgrade-title]').textContent=evidence?c.evidenceTitle:c.projectTitle;root.querySelector('[data-upgrade-body]').textContent=evidence?c.evidenceBody:c.projectBody;root.querySelector('[data-upgrade-close]').textContent=c.close;root.querySelector('[data-upgrade-cta]').textContent=c.cta;}
function openModal(source='project_limit'){upgradeSource=source;renderModal();modal().classList.remove('hidden');document.body.style.overflow='hidden';}
function closeModal(){modal().classList.add('hidden');document.body.style.overflow='';}

function badge(){let el=document.querySelector('.atlas-plan-badge');if(el)return el;const nav=document.querySelector('.nav-actions');if(!nav)return null;el=document.createElement('span');el.className='atlas-plan-badge';el.setAttribute('aria-live','polite');nav.insertBefore(el,nav.firstChild);return el;}
function renderBadge(){const el=badge();if(!el)return;const c=copy(),value=plan();el.dataset.plan=value;el.textContent=value==='pro'?c.pro:c.free;el.title=value==='pro'?'Atlas Pro':'Atlas Free';}

function interceptClick(event){const target=event.target?.closest?.('#start-button,#restart-button,#new-analysis-button,[data-add-evidence]');if(!target)return;if(target.matches('[data-add-evidence]')){if(!shouldBlockEvidence())return;event.preventDefault();event.stopImmediatePropagation();openModal('evidence_limit');window.dispatchEvent(new CustomEvent('atlas:free-evidence-limit',{detail:{count:evidenceCount()}}));return;}if(!shouldBlockProject())return;event.preventDefault();event.stopImmediatePropagation();openModal('project_limit');window.dispatchEvent(new CustomEvent('atlas:free-project-limit',{detail:{projects:readProjects().length}}));}
function interceptSubmit(event){const form=event.target?.closest?.('[data-evidence-form]');if(!isNewEvidenceForm(form)||!shouldBlockEvidence())return;event.preventDefault();event.stopImmediatePropagation();openModal('evidence_limit');window.dispatchEvent(new CustomEvent('atlas:free-evidence-limit',{detail:{count:evidenceCount()}}));}

export function initPlanGating(){if(initialized)return;styles();modal();renderBadge();document.addEventListener('click',interceptClick,true);document.addEventListener('submit',interceptSubmit,true);window.addEventListener('atlas:entitlements',renderBadge);window.addEventListener('atlas:auth',()=>setTimeout(renderBadge,0));window.addEventListener('atlas:locale',()=>{renderBadge();if(!modal().classList.contains('hidden'))renderModal();});initialized=true;}

initPlanGating();
