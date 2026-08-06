import { getLocale } from './i18n.js';
import { renderReport } from './report.js';
import { state } from './state.js';
import { track } from './tracking.js';
import { setProgress, showView } from './ui.js';

const STORAGE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';
let initialized=false;

const copy=()=>getLocale()==='en'?{
  open:'My projects',title:'Atlas Projects',subtitle:'Your validation work stays on this browser during Beta.',empty:'You do not have saved projects yet. Generate a report and Atlas will save it here automatically.',score:'Score',updated:'Updated',view:'Open',rename:'Rename',remove:'Delete',close:'Close',local:'Beta workspace · stored on this device',saved:'Project saved',confirm:'Delete this project?',prompt:'New project name',untitled:'Untitled project'
}:{
  open:'Mis proyectos',title:'Proyectos Atlas',subtitle:'Tu trabajo de validación permanece en este navegador durante la Beta.',empty:'Todavía no tienes proyectos guardados. Genera un informe y Atlas lo guardará aquí automáticamente.',score:'Puntuación',updated:'Actualizado',view:'Abrir',rename:'Renombrar',remove:'Eliminar',close:'Cerrar',local:'Workspace Beta · guardado en este dispositivo',saved:'Proyecto guardado',confirm:'¿Eliminar este proyecto?',prompt:'Nuevo nombre del proyecto',untitled:'Proyecto sin título'
};

function read(){
  try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}
}
function write(projects){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));}
function id(){return globalThis.crypto?.randomUUID?.()||`atlas-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function nameFromIdea(idea){const value=String(idea||'').trim();return value?value.slice(0,64):copy().untitled;}
function escape(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function date(value){try{return new Intl.DateTimeFormat(getLocale()==='en'?'en-GB':'es-ES',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));}catch{return'';}}

function styles(){
  if(document.getElementById('atlas-workspace-styles'))return;
  const style=document.createElement('style');style.id='atlas-workspace-styles';style.textContent=`
  .workspace-open{white-space:nowrap}.workspace-modal{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(2,7,15,.78);backdrop-filter:blur(14px)}.workspace-modal.hidden{display:none}.workspace-panel{width:min(920px,100%);max-height:min(760px,90vh);overflow:auto;border:1px solid var(--line);border-radius:24px;background:linear-gradient(150deg,#0f1d33,#071321);box-shadow:0 40px 120px rgba(0,0,0,.55);padding:24px}.workspace-head{display:flex;justify-content:space-between;gap:18px;align-items:start;padding-bottom:18px;border-bottom:1px solid var(--line)}.workspace-head h2{margin:4px 0 6px;font-size:32px}.workspace-head p{margin:0;color:var(--muted)}.workspace-close{border:1px solid var(--line);background:#081523;color:var(--text);border-radius:12px;padding:10px 13px;cursor:pointer}.workspace-local{display:block;margin:14px 0;color:var(--blue);font-size:12px;letter-spacing:.06em}.workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.workspace-card{border:1px solid var(--line);border-radius:17px;background:#081523;padding:17px}.workspace-card h3{font-size:18px;margin:0 0 10px;line-height:1.3}.workspace-meta{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:12px;margin-bottom:14px}.workspace-actions{display:grid;grid-template-columns:1fr auto auto;gap:7px}.workspace-actions button{border:1px solid var(--line);border-radius:11px;background:#0d1d31;color:var(--text);padding:10px;cursor:pointer}.workspace-actions .workspace-view{border-color:rgba(91,201,255,.45);background:rgba(91,201,255,.1);font-weight:800}.workspace-empty{padding:42px 16px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:16px}.workspace-toast{position:fixed;right:18px;bottom:18px;z-index:1100;padding:12px 15px;border:1px solid rgba(91,201,255,.4);border-radius:13px;background:#0b1b2f;color:var(--text);box-shadow:var(--shadow)}@media(max-width:700px){.workspace-open{font-size:0}.workspace-open:after{content:'PRO';font-size:12px}.workspace-grid{grid-template-columns:1fr}.workspace-panel{padding:17px}.workspace-head h2{font-size:26px}.workspace-actions{grid-template-columns:1fr 1fr}.workspace-actions .workspace-view{grid-column:1/-1}}
  `;document.head.appendChild(style);
}

function modal(){
  let root=document.getElementById('workspace-modal');if(root)return root;
  root=document.createElement('div');root.id='workspace-modal';root.className='workspace-modal hidden';root.innerHTML='<section class="workspace-panel" role="dialog" aria-modal="true"><header class="workspace-head"><div><p class="eyebrow">ATLAS PRO</p><h2 data-workspace-title></h2><p data-workspace-subtitle></p></div><button class="workspace-close" type="button" data-workspace-close>×</button></header><span class="workspace-local" data-workspace-local></span><div id="workspace-list"></div></section>';
  document.body.appendChild(root);
  root.addEventListener('click',event=>{if(event.target===root||event.target.closest('[data-workspace-close]'))closeWorkspace();});
  return root;
}
function toast(){const c=copy();const el=document.createElement('div');el.className='workspace-toast';el.textContent=c.saved;document.body.appendChild(el);setTimeout(()=>el.remove(),1700);}

function render(){
  const c=copy(),root=modal();root.querySelector('[data-workspace-title]').textContent=c.title;root.querySelector('[data-workspace-subtitle]').textContent=c.subtitle;root.querySelector('[data-workspace-local]').textContent=c.local;
  const target=root.querySelector('#workspace-list');const projects=read().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  if(!projects.length){target.innerHTML=`<div class="workspace-empty">${escape(c.empty)}</div>`;return;}
  target.innerHTML=`<div class="workspace-grid">${projects.map(project=>`<article class="workspace-card" data-project-id="${escape(project.id)}"><h3>${escape(project.name)}</h3><div class="workspace-meta"><span>${escape(c.score)}: <strong>${Number(project.report?.score)||0}/100</strong></span><span>${escape(c.updated)}: ${escape(date(project.updatedAt))}</span></div><div class="workspace-actions"><button class="workspace-view" type="button" data-action="open">${escape(c.view)}</button><button type="button" data-action="rename">${escape(c.rename)}</button><button type="button" data-action="delete">${escape(c.remove)}</button></div></article>`).join('')}</div>`;
  target.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>act(button.closest('[data-project-id]').dataset.projectId,button.dataset.action)));
}
function act(projectId,action){
  const projects=read(),project=projects.find(item=>item.id===projectId);if(!project)return;
  if(action==='open'){
    state.idea=project.idea||'';state.answers=project.answers||[];state.report=project.report||{};state.maturity=project.maturity||'unknown';state.profile=project.profile||'unknown';state.mode=project.mode||'unknown';localStorage.setItem(ACTIVE_KEY,project.id);renderReport(state.report);showView('report-view');setProgress(100,getLocale()==='en'?'Project opened':'Proyecto abierto');closeWorkspace();document.getElementById('validator')?.scrollIntoView({behavior:'smooth'});track('pro_project_opened',{projectId:project.id});return;
  }
  if(action==='rename'){
    const next=prompt(copy().prompt,project.name);if(!next?.trim())return;project.name=next.trim().slice(0,80);project.updatedAt=new Date().toISOString();write(projects);render();track('pro_project_renamed');return;
  }
  if(action==='delete'&&confirm(copy().confirm)){write(projects.filter(item=>item.id!==projectId));if(localStorage.getItem(ACTIVE_KEY)===projectId)localStorage.removeItem(ACTIVE_KEY);render();track('pro_project_deleted');}
}

export function openWorkspace(){render();modal().classList.remove('hidden');track('pro_workspace_opened',{projects:read().length});}
export function closeWorkspace(){modal().classList.add('hidden');}

export function saveGeneratedProject({idea,answers,report,maturity,profile,mode}){
  if(!report||!idea)return null;
  const projects=read();const activeId=localStorage.getItem(ACTIVE_KEY);let project=projects.find(item=>item.id===activeId);
  const now=new Date().toISOString();
  if(!project){project={id:id(),name:nameFromIdea(idea),createdAt:now};projects.push(project);}
  Object.assign(project,{idea,answers:Array.isArray(answers)?answers:[],report,maturity,profile,mode,updatedAt:now});
  write(projects);localStorage.setItem(ACTIVE_KEY,project.id);toast();track('pro_project_saved',{projectId:project.id,score:Number(report.score)||0});return project;
}

export function startNewWorkspaceProject(){localStorage.removeItem(ACTIVE_KEY);}

export function initWorkspace(){
  if(initialized)return;styles();modal();const nav=document.querySelector('.nav-actions');if(nav){const button=document.createElement('button');button.type='button';button.className='secondary-button button-small workspace-open';button.textContent=copy().open;button.addEventListener('click',openWorkspace);nav.insertBefore(button,nav.lastElementChild);window.addEventListener('atlas:locale',()=>{button.textContent=copy().open;if(!modal().classList.contains('hidden'))render();});}initialized=true;
}
