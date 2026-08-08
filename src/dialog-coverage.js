import { ask, notice, promptText } from './atlas-confirm.js';
import { cloudReady, upsertCloudProject } from './cloud-projects.js';
import { track } from './tracking.js';

const STORAGE_KEY='atlas-pro-workspace-v1';
let copilotProjectId='';
let experimentProjectId='';

function english(){return document.documentElement.lang==='en';}
function id(){return globalThis.crypto?.randomUUID?.()||`atlas-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function read(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function write(projects){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));}
function toast(message){const el=document.createElement('div');el.className='workspace-toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),1700);}
function timeline(project,type,meta={}){project.timeline=Array.isArray(project.timeline)?project.timeline:[];project.timeline.push({id:id(),type,at:new Date().toISOString(),meta});if(project.timeline.length>120)project.timeline=project.timeline.slice(-120);}
function sync(project){if(cloudReady())upsertCloudProject(project).catch(error=>console.warn('atlas_cloud_save_failed',error));}

async function clearCopilot(button){
  if(!copilotProjectId)return false;
  const accepted=await ask(english()?{tone:'danger',title:'Clear this conversation?',message:'The Copilot conversation for this project will be removed. This action cannot be undone.',confirm:'Clear chat'}:{tone:'danger',title:'¿Borrar esta conversación?',message:'Se eliminará la conversación del Copiloto de este proyecto. Esta acción no se puede deshacer.',confirm:'Borrar chat'},button);
  if(!accepted)return true;
  const projects=read(),project=projects.find(item=>item.id===copilotProjectId);if(!project)return true;
  project.copilot={...(project.copilot||{}),messages:[],updatedAt:new Date().toISOString()};project.updatedAt=new Date().toISOString();write(projects);sync(project);
  const body=document.querySelector('#atlas-copilot-modal [data-copilot-body]');if(body)body.innerHTML=`<div class="copilot-empty">${english()?'Ask Atlas what you should validate next.':'Pregunta a Atlas qué deberías validar ahora.'}</div>`;
  toast(english()?'Conversation cleared':'Conversación borrada');track('pro_copilot_chat_cleared',{projectId:project.id});return true;
}

async function deleteExperiment(button){
  const card=button.closest('.experiment-card[data-experiment-id]'),experimentId=card?.dataset.experimentId||'';if(!experimentId||!experimentProjectId)return false;
  const accepted=await ask(english()?{tone:'danger',title:'Delete this experiment?',message:'The experiment and its saved progress will be removed. This action cannot be undone.',confirm:'Delete experiment'}:{tone:'danger',title:'¿Eliminar este experimento?',message:'Se eliminarán el experimento y su progreso guardado. Esta acción no se puede deshacer.',confirm:'Eliminar experimento'},button);if(!accepted)return true;
  const projects=read(),project=projects.find(item=>item.id===experimentProjectId);if(!project)return true;project.experiments=Array.isArray(project.experiments)?project.experiments.filter(item=>item.id!==experimentId):[];project.updatedAt=new Date().toISOString();timeline(project,'experiment_deleted',{experimentId});write(projects);sync(project);card.remove();
  const list=document.querySelector('#atlas-experiment-modal .experiment-list');if(list&&!list.querySelector('.experiment-card')){const empty=document.createElement('div');empty.className='experiment-empty';empty.textContent=english()?'No experiments yet. Ask Copilot to draft one or create it here.':'Todavía no hay experimentos. Pide un borrador al Copiloto o créalo aquí.';list.replaceWith(empty);}toast(english()?'Experiment deleted':'Experimento eliminado');track('pro_experiment_deleted',{projectId:project.id,experimentId});return true;
}

async function renameProject(button){
  const card=button.closest('.workspace-card[data-project-id]'),projectId=card?.dataset.projectId||'';if(!projectId)return false;const projects=read(),project=projects.find(item=>item.id===projectId);if(!project)return false;
  const next=await promptText(english()?{title:'Rename project',message:'Choose a clear name for this project.',value:project.name||'',confirm:'Save name',maxLength:80}:{title:'Renombrar proyecto',message:'Elige un nombre claro para este proyecto.',value:project.name||'',confirm:'Guardar nombre',maxLength:80},button);if(next===null)return true;const value=String(next).trim();if(!value)return true;
  const previous=project.name;project.name=value.slice(0,80);project.updatedAt=new Date().toISOString();timeline(project,'project_renamed',{previous,next:project.name});write(projects);sync(project);const title=card.querySelector('h3');if(title)title.textContent=project.name;toast(english()?'Project renamed':'Proyecto renombrado');track('pro_project_renamed');return true;
}

const nativeAlert=window.alert.bind(window);
window.alert=message=>{try{void notice({title:'Atlas',message:String(message??'')});}catch{nativeAlert(message);}};

document.addEventListener('click',event=>{
  const button=event.target instanceof Element?event.target.closest('button'):null;if(!(button instanceof HTMLButtonElement))return;
  if(button.matches('[data-atlas-copilot]')){copilotProjectId=button.closest('.workspace-card[data-project-id]')?.dataset.projectId||'';return;}
  if(button.matches('[data-atlas-experiments]')){experimentProjectId=button.closest('.workspace-card[data-project-id]')?.dataset.projectId||'';return;}
  if(button.matches('[data-copilot-clear]')){event.preventDefault();event.stopImmediatePropagation();void clearCopilot(button);return;}
  if(button.matches('.experiment-card [data-exp-action="delete"]')){event.preventDefault();event.stopImmediatePropagation();void deleteExperiment(button);return;}
  if(button.matches('.workspace-card [data-action="rename"]')){event.preventDefault();event.stopImmediatePropagation();void renameProject(button);}
},true);
