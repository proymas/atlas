const STORAGE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';
const SCHEMA_VERSION=2;
const MAX_VERSIONS=30;
let idleHandle=null;

function id(){return globalThis.crypto?.randomUUID?.()||`atlas-version-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function clone(value){try{return JSON.parse(JSON.stringify(value));}catch{return value;}}
function read(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function write(projects){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));return true;}catch(error){console.error('atlas_project_memory_write_failed',error);window.dispatchEvent(new CustomEvent('atlas:memory-error',{detail:{reason:'storage_write_failed'}}));return false;}}
function fingerprint(project){
  const payload={idea:project.idea||'',answers:Array.isArray(project.answers)?project.answers:[],report:project.report||{},maturity:project.maturity||'unknown',profile:project.profile||'unknown',mode:project.mode||'unknown'};
  try{return JSON.stringify(payload);}catch{return String(Date.now());}
}
function createSnapshot(project,source='analysis'){
  const at=project.updatedAt||new Date().toISOString();
  const evidence=Array.isArray(project.evidence)?project.evidence:[];
  return {
    id:id(),
    number:(Array.isArray(project.versions)?project.versions.length:0)+1,
    createdAt:at,
    source,
    fingerprint:fingerprint(project),
    idea:String(project.idea||''),
    answers:clone(Array.isArray(project.answers)?project.answers:[]),
    report:clone(project.report||{}),
    maturity:project.maturity||'unknown',
    profile:project.profile||'unknown',
    mode:project.mode||'unknown',
    evidenceCutoffAt:at,
    evidenceIds:evidence.map(item=>item?.id).filter(Boolean),
    evidenceSnapshot:clone(evidence),
    score:Number(project.report?.score)||0,
    verdict:String(project.report?.verdict||''),
  };
}
function normalizeProject(project){
  let changed=false;
  if(!Array.isArray(project.versions)){project.versions=[];changed=true;}
  if(project.report&&Object.keys(project.report).length){
    const current=fingerprint(project);
    const latest=project.versions.at(-1);
    if(!latest||latest.fingerprint!==current){project.versions.push(createSnapshot(project,latest?'analysis':'legacy_import'));changed=true;}
  }
  if(project.versions.length>MAX_VERSIONS){project.versions=project.versions.slice(-MAX_VERSIONS);project.versions.forEach((version,index)=>{version.number=index+1;});changed=true;}
  const currentVersion=project.versions.at(-1);
  if(project.currentVersionId!==currentVersion?.id){project.currentVersionId=currentVersion?.id||null;changed=true;}
  if(project.memorySchemaVersion!==SCHEMA_VERSION){project.memorySchemaVersion=SCHEMA_VERSION;changed=true;}
  return changed;
}
function analysisViewIsActive(){
  const loading=document.getElementById('loading-view');
  return Boolean(loading&&!loading.classList.contains('hidden'));
}
export function syncProjectMemory(){
  const projects=read();
  if(analysisViewIsActive())return projects;
  let changed=false;
  projects.forEach(project=>{if(normalizeProject(project))changed=true;});
  if(changed){write(projects);window.dispatchEvent(new CustomEvent('atlas:memory-synced',{detail:{projects:projects.length}}));}
  return projects;
}
export function getProjectMemory(projectId){const projects=syncProjectMemory();return projects.find(project=>project.id===projectId)||null;}
export function getActiveProjectMemory(){const activeId=localStorage.getItem(ACTIVE_KEY);return activeId?getProjectMemory(activeId):null;}
export function getProjectVersions(projectId){return getProjectMemory(projectId)?.versions||[];}
function scheduleSync(){
  if(idleHandle)return;
  const run=()=>{idleHandle=null;if(!analysisViewIsActive())syncProjectMemory();};
  if('requestIdleCallback' in window)idleHandle=window.requestIdleCallback(run,{timeout:2500});
  else idleHandle=window.setTimeout(run,1200);
}
export function initProjectMemory(){
  syncProjectMemory();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSync();});
  window.addEventListener('beforeunload',()=>{if(!analysisViewIsActive())syncProjectMemory();});
  window.addEventListener('atlas:project-changed',scheduleSync);
  window.addEventListener('atlas:reanalysis-complete',scheduleSync);
  window.AtlasProjectMemory={sync:syncProjectMemory,getProject:getProjectMemory,getActive:getActiveProjectMemory,getVersions:getProjectVersions,schemaVersion:SCHEMA_VERSION};
}
