import { getLocale } from './i18n.js';
import { renderReport } from './report.js';
import { state } from './state.js';
import { track } from './tracking.js';
import { setProgress, showView } from './ui.js';
import { getProjectMemory, syncProjectMemory } from './project-memory.js';

const STORAGE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';
const REQUEST_TIMEOUT_MS=52000;
let observer=null;
let busyProjectId=null;
let activeController=null;

const text=()=>getLocale()==='en'?{
  button:'Reanalyse',working:'Reanalysing…',noEvidence:'Add new or updated evidence before reanalysing this project.',confirm:'Atlas will create a new version using only the evidence added since the previous analysis. Continue?',failed:'Atlas could not complete the reanalysis. Please try again.',timeout:'The reanalysis took too long. Atlas stopped it safely; your project and evidence remain unchanged.',done:'Reanalysis complete',preparing:'Preparing project memory…',analysing:'Reviewing the new evidence…',retrying:'Verifying the evidence one more time…'
}:{
  button:'Reanalizar',working:'Reanalizando…',noEvidence:'Añade una evidencia nueva o actualizada antes de reanalizar este proyecto.',confirm:'Atlas creará una nueva versión usando solo las evidencias añadidas desde el análisis anterior. ¿Continuar?',failed:'Atlas no pudo completar el reanálisis. Inténtalo de nuevo.',timeout:'El reanálisis ha tardado demasiado. Atlas lo ha detenido de forma segura; tu proyecto y tus evidencias siguen intactos.',done:'Reanálisis completado',preparing:'Preparando la memoria del proyecto…',analysing:'Revisando las evidencias nuevas…',retrying:'Verificando las evidencias una vez más…'
};

function clone(value){try{return JSON.parse(JSON.stringify(value));}catch{return value;}}
function uid(){return globalThis.crypto?.randomUUID?.()||`atlas-version-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function read(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function write(projects){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));}
function latestVersion(project){return Array.isArray(project?.versions)&&project.versions.length?project.versions.at(-1):null;}
function nextFrame(){return new Promise(resolve=>requestAnimationFrame(()=>resolve()));}
function stableEvidence(item){return JSON.stringify({category:item?.category||'',impact:item?.impact||'',description:item?.description||'',link:item?.link||'',createdAt:item?.createdAt||'',updatedAt:item?.updatedAt||''});}
function evidenceAfter(project,version){
  const previous=new Map((Array.isArray(version?.evidenceSnapshot)?version.evidenceSnapshot:[]).filter(Boolean).map(item=>[item.id,stableEvidence(item)]));
  const knownIds=new Set(Array.isArray(version?.evidenceIds)?version.evidenceIds:[]);
  return (Array.isArray(project?.evidence)?project.evidence:[]).filter(item=>{
    if(!item?.id||!knownIds.has(item.id)||!previous.has(item.id))return true;
    return previous.get(item.id)!==stableEvidence(item);
  });
}
function safetyJson(value,max=18000){let result='';try{result=JSON.stringify(value);}catch{result=String(value||'');}return result.slice(0,max);}
function normalizedEvidence(newEvidence){return newEvidence.map((item,index)=>({evidenceNumber:index+1,id:item.id,category:item.category||'learning',impact:item.impact||'neutral',description:item.description||'',link:item.link||'',createdAt:item.createdAt||'',updatedAt:item.updatedAt||item.createdAt||''}));}
function contextPrompt(project,base,newEvidence,retry=false){
  const locale=getLocale();
  const evidence=normalizedEvidence(newEvidence);
  const instruction=locale==='en'
    ? `INCREMENTAL REANALYSIS. You have received exactly ${evidence.length} NEW EVIDENCE ITEM(S), listed first below. They are verified user-provided project updates and MUST materially inform the report. Never claim that no new evidence was provided. Keep the original business idea unchanged. Compare the previous report with these items only. Do not restart discovery and do not invent evidence. Produce a complete updated Atlas report in the normal report JSON schema. Calibrate score changes conservatively. Paid behaviour and repeated observable evidence may justify meaningful increases; opinions alone should not. If evidence contradicts the idea, lower the relevant dimensions. The seven-day plan must start from the project's current state.${retry?' Your previous draft incorrectly ignored the supplied evidence; explicitly correct that error now.':''}`
    : `REANÁLISIS INCREMENTAL. Has recibido exactamente ${evidence.length} EVIDENCIA(S) NUEVA(S), enumeradas al principio. Son actualizaciones reales aportadas por el usuario y DEBEN influir materialmente en el informe. Nunca afirmes que no se aportaron evidencias nuevas. Mantén intacta la idea original. Compara el informe anterior únicamente con estas evidencias. No reinicies el descubrimiento ni inventes evidencia. Produce un informe Atlas completo actualizado con el esquema JSON habitual. Ajusta la puntuación de forma conservadora. El comportamiento de pago y la evidencia observable repetida pueden justificar subidas relevantes; las opiniones por sí solas no. Si la evidencia contradice la idea, reduce las dimensiones afectadas. El plan de siete días debe partir del estado actual.${retry?' Tu borrador anterior ignoró incorrectamente las evidencias aportadas; corrige expresamente ese error ahora.':''}`;
  return `${instruction}\n\nNEW EVIDENCE — REQUIRED INPUT (${evidence.length}):\n${safetyJson(evidence,10000)}\n\nORIGINAL BUSINESS IDEA:\n${String(project.idea||'').slice(0,5000)}\n\nBASE VERSION: v${base?.number||1}\nPREVIOUS REPORT:\n${safetyJson(base?.report||project.report,14000)}\n\nORIGINAL ANSWERS:\n${safetyJson(base?.answers||project.answers,9000)}`;
}
function evidenceAnswers(newEvidence){
  const locale=getLocale();
  return normalizedEvidence(newEvidence).map(item=>({question:locale==='en'?`New verified project evidence ${item.evidenceNumber}`:`Nueva evidencia verificada del proyecto ${item.evidenceNumber}`,answer:`[${item.category} · ${item.impact}] ${item.description}${item.link?` | ${item.link}`:''}`}));
}
function falselyClaimsNoEvidence(report){
  const value=JSON.stringify(report||{}).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return /no (?:se )?(?:aportaron|presentaron|proporcionaron|recibieron|hay|existen) (?:nuevas )?evidencias|sin (?:nuevas )?evidencias|no new evidence|no evidence (?:was )?(?:provided|received|submitted)|without new evidence/.test(value);
}
function updateLoading(copy,progress){
  const label=document.getElementById('loading-copy');
  if(label)label.textContent=copy;
  setProgress(progress,copy);
}
function beginBusyUi(base){
  document.getElementById('workspace-modal')?.classList.add('hidden');
  showView('loading-view');
  updateLoading(`${text().preparing} · v${(base?.number||1)+1}`,76);
  document.getElementById('validator')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function restoreUiAfterFailure(){
  if(state.report){renderReport(state.report);showView('report-view');setProgress(100,'');}
  else showView('start-view');
  document.getElementById('workspace-modal')?.classList.remove('hidden');
}
async function requestReport(project,base,newEvidence,retry=false){
  const structured=evidenceAnswers(newEvidence);
  updateLoading(retry?text().retrying:text().analysing,retry?90:83);
  const controller=new AbortController();
  activeController=controller;
  const timeout=setTimeout(()=>controller.abort('timeout'),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,body:JSON.stringify({stage:'report',idea:contextPrompt(project,base,newEvidence,retry),answers:[...structured,...(Array.isArray(project.answers)?project.answers:[])],evidence:normalizedEvidence(newEvidence),newEvidence:normalizedEvidence(newEvidence),evidenceCount:newEvidence.length,language:getLocale(),locale:getLocale(),reanalysis:true,baseVersionId:base?.id||null})});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw new Error(data.error||'reanalyze_failed');
    if(data.status==='blocked'||data.classification==='prohibited')throw new Error(data.reason||'reanalyze_blocked');
    return data;
  }catch(error){
    if(error?.name==='AbortError'||controller.signal.aborted)throw new Error('reanalysis_timeout');
    throw error;
  }finally{
    clearTimeout(timeout);
    if(activeController===controller)activeController=null;
  }
}
async function callEngine(project,base,newEvidence){
  let report=await requestReport(project,base,newEvidence,false);
  if(newEvidence.length&&falselyClaimsNoEvidence(report))report=await requestReport(project,base,newEvidence,true);
  if(newEvidence.length&&falselyClaimsNoEvidence(report))throw new Error('evidence_not_acknowledged');
  return report;
}
function appendVersion(project,base,report,newEvidence){
  const now=new Date().toISOString();
  const allEvidence=Array.isArray(project.evidence)?project.evidence:[];
  const versions=Array.isArray(project.versions)?project.versions:[];
  const previousScore=Number(base?.report?.score??base?.score??project.report?.score)||0;
  const nextScore=Number(report?.score)||0;
  const snapshot={id:uid(),number:versions.length+1,createdAt:now,source:'incremental_reanalysis',baseVersionId:base?.id||null,idea:String(project.idea||''),answers:clone(project.answers||[]),report:clone(report),maturity:report.maturity||project.maturity||'unknown',profile:report.profile||project.profile||'unknown',mode:report.analysisMode||project.mode||'unknown',evidenceCutoffAt:now,evidenceIds:allEvidence.map(item=>item?.id).filter(Boolean),evidenceSnapshot:clone(allEvidence),evidenceUsedIds:newEvidence.map(item=>item.id),evidenceUsedSnapshot:clone(newEvidence),score:nextScore,verdict:String(report?.verdict||''),comparison:{previousScore,nextScore,scoreDelta:nextScore-previousScore,previousVerdict:String(base?.report?.verdict||base?.verdict||''),nextVerdict:String(report?.verdict||''),newEvidenceCount:newEvidence.length}};
  snapshot.fingerprint=JSON.stringify({idea:snapshot.idea,answers:snapshot.answers,report:snapshot.report,maturity:snapshot.maturity,profile:snapshot.profile,mode:snapshot.mode});
  versions.push(snapshot);project.versions=versions.slice(-30);project.versions.forEach((version,index)=>{version.number=index+1;});
  project.currentVersionId=project.versions.at(-1)?.id||snapshot.id;project.report=report;project.updatedAt=now;project.maturity=snapshot.maturity;project.profile=snapshot.profile;project.mode=snapshot.mode;
  project.timeline=Array.isArray(project.timeline)?project.timeline:[];project.timeline.push({id:uid(),type:'reanalysis_generated',at:now,meta:{version:snapshot.number,baseVersion:base?.number||1,score:nextScore,scoreDelta:snapshot.comparison.scoreDelta,evidenceCount:newEvidence.length,evidenceIds:newEvidence.map(item=>item.id)}});
  if(project.timeline.length>120)project.timeline=project.timeline.slice(-120);
  return snapshot;
}
function showResult(project,report,snapshot){
  localStorage.setItem(ACTIVE_KEY,project.id);state.idea=project.idea||'';state.answers=project.answers||[];state.report=report;state.maturity=project.maturity||'unknown';state.profile=project.profile||'unknown';state.mode=project.mode||'unknown';
  renderReport(report);showView('report-view');setProgress(100,`${text().done} · v${snapshot.number}`);document.getElementById('workspace-modal')?.classList.add('hidden');document.getElementById('validator')?.scrollIntoView({behavior:'smooth',block:'start'});
}
async function reanalyse(projectId,button){
  if(busyProjectId)return;
  syncProjectMemory();
  const project=getProjectMemory(projectId);if(!project)return;
  const base=latestVersion(project);const newEvidence=evidenceAfter(project,base);
  if(!newEvidence.length){alert(text().noEvidence);track('pro_reanalysis_blocked_no_evidence',{projectId});return;}
  if(!confirm(text().confirm))return;
  busyProjectId=projectId;
  const original=button.textContent;
  button.disabled=true;button.textContent=text().working;
  track('pro_reanalysis_started',{projectId,baseVersion:base?.number||1,evidenceCount:newEvidence.length,evidenceIds:newEvidence.map(item=>item.id)});
  beginBusyUi(base);
  await nextFrame();
  try{
    const report=await callEngine(project,base,newEvidence);
    updateLoading(text().done,96);
    await nextFrame();
    const projects=read();const stored=projects.find(item=>item.id===projectId);if(!stored)throw new Error('project_missing');
    const storedBase=latestVersion(stored)||base;const snapshot=appendVersion(stored,storedBase,report,newEvidence);
    write(projects);syncProjectMemory();showResult(stored,report,snapshot);
    track('pro_reanalysis_completed',{projectId,version:snapshot.number,score:snapshot.score,scoreDelta:snapshot.comparison.scoreDelta,evidenceCount:newEvidence.length});
  }catch(error){
    console.error('atlas_reanalysis_failed',error);
    restoreUiAfterFailure();
    alert(error?.message==='reanalysis_timeout'?text().timeout:text().failed);
    track('analysis_error',{errorCode:error?.message==='reanalysis_timeout'?'incremental_reanalysis_timeout':error?.message==='evidence_not_acknowledged'?'reanalysis_evidence_ignored':'incremental_reanalysis_failed'});
  }finally{
    busyProjectId=null;activeController=null;button.disabled=false;button.textContent=original;
  }
}
function enhance(){
  document.querySelectorAll('.workspace-card[data-project-id]').forEach(card=>{
    const actions=card.querySelector('.workspace-actions');if(!actions||actions.querySelector('[data-reanalyse-project]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.reanalyseProject='';button.textContent=text().button;button.addEventListener('click',event=>{event.stopPropagation();reanalyse(card.dataset.projectId,button);});actions.insertBefore(button,actions.firstChild?.nextSibling||null);
  });
}
export function initReanalysis(){
  if(observer)return;
  observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});enhance();
  window.addEventListener('atlas:locale',enhance);
  window.addEventListener('pagehide',()=>activeController?.abort('page_hidden'));
}
