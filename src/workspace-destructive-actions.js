import { ask } from './atlas-confirm.js';
import { cloudReady, deleteCloudProject, upsertCloudProject } from './cloud-projects.js';
import { track } from './tracking.js';

const STORAGE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';

function english(){return document.documentElement.lang==='en';}
function id(){return globalThis.crypto?.randomUUID?.()||`atlas-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function read(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function write(projects){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));}
function toast(message){
  const el=document.createElement('div');
  el.className='workspace-toast';
  el.textContent=message;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1700);
}
function syncProject(project){
  if(cloudReady())upsertCloudProject(project).catch(error=>console.warn('atlas_cloud_save_failed',error));
}
function refreshEvidenceCount(card){
  const section=card?.closest('.workspace-section');
  if(!section)return;
  const list=section.querySelector('.workspace-evidence-list');
  const remaining=list?.querySelectorAll('.workspace-evidence-card').length||0;
  const header=section.querySelector('.workspace-section-head>div>p:last-child');
  if(header)header.textContent=`${remaining} ${english()?'evidence items':'evidencias'}`;
  if(remaining===0&&list){
    const empty=document.createElement('div');
    empty.className='workspace-empty';
    empty.textContent=english()?'No evidence has been added yet.':'Todavía no has añadido evidencias.';
    list.replaceWith(empty);
  }
}

async function deleteEvidence(button){
  const card=button.closest('.workspace-evidence-card');
  const section=button.closest('.workspace-section');
  const projectId=section?.querySelector('[data-project-id]')?.dataset.projectId||document.querySelector('.workspace-card[data-project-id]')?.dataset.projectId||'';
  const evidenceId=card?.dataset.evidenceId||'';
  if(!card||!evidenceId)return false;
  const projects=read();
  let project=projects.find(item=>Array.isArray(item.evidence)&&item.evidence.some(entry=>entry.id===evidenceId));
  if(projectId)project=projects.find(item=>item.id===projectId)||project;
  if(!project)return false;
  const accepted=await ask(english()?{
    title:'Delete this evidence?',message:'This evidence will be removed from the project. This action cannot be undone.',confirm:'Delete evidence'
  }:{
    title:'¿Eliminar esta evidencia?',message:'Esta evidencia se eliminará del proyecto. Esta acción no se puede deshacer.',confirm:'Eliminar evidencia'
  },button);
  if(!accepted)return true;
  const item=project.evidence.find(entry=>entry.id===evidenceId);
  project.evidence=project.evidence.filter(entry=>entry.id!==evidenceId);
  project.updatedAt=new Date().toISOString();
  project.timeline=Array.isArray(project.timeline)?project.timeline:[];
  project.timeline.push({id:id(),type:'evidence_deleted',at:project.updatedAt,meta:{evidenceId,category:item?.category||''}});
  if(project.timeline.length>120)project.timeline=project.timeline.slice(-120);
  write(projects);
  syncProject(project);
  card.remove();
  refreshEvidenceCount(card);
  toast(english()?'Evidence deleted':'Evidencia eliminada');
  track('pro_evidence_deleted',{projectId:project.id,category:item?.category||'unknown'});
  window.dispatchEvent(new CustomEvent('atlas:workspace-rendered'));
  return true;
}

async function deleteProject(button){
  const card=button.closest('.workspace-card[data-project-id]');
  const projectId=card?.dataset.projectId||'';
  if(!card||!projectId)return false;
  const projects=read();
  if(!projects.some(item=>item.id===projectId))return false;
  const accepted=await ask(english()?{
    title:'Delete this project?',message:'The project and its saved history will be removed. This action cannot be undone.',confirm:'Delete project'
  }:{
    title:'¿Eliminar este proyecto?',message:'Se eliminarán el proyecto y su historial guardado. Esta acción no se puede deshacer.',confirm:'Eliminar proyecto'
  },button);
  if(!accepted)return true;
  write(projects.filter(item=>item.id!==projectId));
  if(cloudReady())deleteCloudProject(projectId).catch(error=>console.warn('atlas_cloud_delete_failed',error));
  if(localStorage.getItem(ACTIVE_KEY)===projectId)localStorage.removeItem(ACTIVE_KEY);
  card.remove();
  const grid=document.querySelector('#workspace-list .workspace-grid');
  if(grid&&!grid.querySelector('.workspace-card')){
    const empty=document.createElement('div');
    empty.className='workspace-empty';
    empty.textContent=english()?'You do not have saved projects yet. Generate a report and Atlas will save it here automatically.':'Todavía no tienes proyectos guardados. Genera un informe y Atlas lo guardará aquí automáticamente.';
    grid.replaceWith(empty);
  }
  toast(english()?'Project deleted':'Proyecto eliminado');
  track('pro_project_deleted');
  window.dispatchEvent(new CustomEvent('atlas:workspace-rendered'));
  return true;
}

async function intercept(event){
  const button=event.target instanceof Element?event.target.closest('button'):null;
  if(!(button instanceof HTMLButtonElement))return;
  let handled=false;
  if(button.matches('[data-delete-evidence]')){
    event.preventDefault();event.stopImmediatePropagation();
    handled=await deleteEvidence(button);
  }else if(button.matches('.workspace-card [data-action="delete"]')){
    event.preventDefault();event.stopImmediatePropagation();
    handled=await deleteProject(button);
  }
  return handled;
}

document.addEventListener('click',intercept,true);
