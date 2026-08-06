import { getLocale } from './i18n.js';
import { renderReport } from './report.js';
import { state } from './state.js';
import { track } from './tracking.js';
import { setProgress, showView } from './ui.js';
import { getProjectMemory, syncProjectMemory } from './project-memory.js';

const STORAGE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';
let observer=null;
let busyProjectId=null;

const text=()=>getLocale()==='en'?{
  button:'Reanalyse',working:'Reanalysing…',noEvidence:'Add new or updated evidence before reanalysing this project.',confirm:'Atlas will create a new version using only the evidence added since the previous analysis. Continue?',failed:'Atlas could not complete the reanalysis. Please try again.',done:'Reanalysis complete',event:'Incremental reanalysis generated'
}:{
  button:'Reanalizar',working:'Reanalizando…',noEvidence:'Añade una evidencia nueva o actualizada antes de reanalizar este proyecto.',confirm:'Atlas creará una nueva versión usando solo las evidencias añadidas desde el análisis anterior. ¿Continuar?',failed:'Atlas no pudo completar el reanálisis. Inténtalo de nuevo.',done:'Reanálisis completado',event:'Reanálisis incremental generado'
};

function clone(value){try{return JSON.parse(JSON.stringify(value));}catch{return value;}}
function uid(){return globalThis.crypto?.randomUUID?.()||`atlas-version-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
function read(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
function write(projects){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));}
function latestVersion(project){return Array.isArray(project?.versions)&&project.versions.length?project.versions.at(-1):null;}
function evidenceAfter(project,version){
  const cutoff=Date.parse(version?.evidenceCutoffAt||version?.createdAt||0)||0;
  const known=new Set(Array.isArray(version?.evidenceIds)?version.evidenceIds:[]);
  return (Array.isArray(project?.evidence)?project.evidence:[]).filter(item=>{
    const changed=Date.parse(item?.updatedAt||item?.createdAt||0)||0;
    return !known.has(item?.id)||changed>cutoff;
  });
}
function safetyJson(value,max=18000){let result='';try{result=JSON.stringify(value);}catch{result=String(value||'');}return result.slice(0,max);}
function contextPrompt(project,base,newEvidence){
  const locale=getLocale();
  const evidence=newEvidence.map((item,index)=>({index:index+1,category:item.category,impact:item.impact,description:item.description,link:item.link||'',createdAt:item.createdAt,updatedAt:item.updatedAt}));
  const instruction=locale==='en'
    ? `INCREMENTAL REANALYSIS. Keep the original business idea unchanged. Compare the previous report with only the new evidence below. Do not restart discovery and do not invent evidence. Produce a complete updated Atlas report in the normal report JSON schema. Calibrate score changes conservatively and explain changes through strengths, risks, criticalAssumptions, contradictions and recommendations. Paid behaviour and repeated observable evidence may justify meaningful increases; opinions alone should not. If evidence contradicts the idea, lower the relevant dimensions. The seven-day plan must start from the project's current state.`
    : `REANÁLISIS INCREMENTAL. Mantén intacta la idea de negocio original. Compara el informe anterior únicamente con las evidencias nuevas indicadas. No reinicies el descubrimiento ni inventes evidencia. Produce un informe Atlas completo actualizado con el esquema JSON habitual. Ajusta la puntuación de forma conservadora y explica los cambios mediante fortalezas, riesgos, supuestos críticos, contradicciones y recomendaciones. El comportamiento de pago y la evidencia observable repetida pueden justificar subidas relevantes; las opiniones por sí solas no. Si la evidencia contradice la idea, reduce las dimensiones afectadas. El plan de siete días debe partir del estado actual del proyecto.`;
  return `${project.idea||''}\n\n${instruction}\n\nBASE VERSION: v${base?.number||1}\nPREVIOUS REPORT:\n${safetyJson(base?.report||project.report)}\n\nNEW EVIDENCE SINCE BASE VERSION:\n${safetyJson(evidence)}\n\nORIGINAL ANSWERS:\n${safetyJson(base?.answers||project.answers,12000)}`;
}
async function callEngine(project,base,newEvidence){
  const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({stage:'report',idea:contextPrompt(project,base,newEvidence),answers:Array.isArray(project.answers)?project.answers:[],language:getLocale(),locale:getLocale(),reanalysis:true,baseVersionId:base?.id||null})});
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(data.error||'reanalyze_failed');
  if(data.status==='blocked'||data.classification==='prohibited')throw new Error(data.reason||'reanalyze_blocked');
  return data;
}
function appendVersion(project,base,report,newEvidence){
  const now=new Date().toISOString();
  const allEvidence=Array.isArray(project.evidence)?project.evidence:[];
  const versions=Array.isArray(project.versions)?project.versions:[];
  const previousScore=Number(base?.report?.score??base?.score??project.report?.score)||0;
  const nextScore=Number(report?.score)||0;
  const snapshot={
    id:uid(),number:versions.length+1,createdAt:now,source:'incremental_reanalysis',baseVersionId:base?.id||null,
    idea:String(project.idea||''),answers:clone(project.answers||[]),report:clone(report),maturity:report.maturity||project.maturity||'unknown',profile:report.profile||project.profile||'unknown',mode:report.analysisMode||project.mode||'unknown',
    evidenceCutoffAt:now,evidenceIds:allEvidence.map(item=>item?.id).filter(Boolean),evidenceSnapshot:clone(allEvidence),evidenceUsedIds:newEvidence.map(item=>item.id),score:nextScore,verdict:String(report?.verdict||''),
    comparison:{previousScore,nextScore,scoreDelta:nextScore-previousScore,previousVerdict:String(base?.report?.verdict||base?.verdict||''),nextVerdict:String(report?.verdict||''),newEvidenceCount:newEvidence.length}
  };
  snapshot.fingerprint=JSON.stringify({idea:snapshot.idea,answers:snapshot.answers,report:snapshot.report,maturity:snapshot.maturity,profile:snapshot.profile,mode:snapshot.mode});
  versions.push(snapshot);project.versions=versions.slice(-30);project.versions.forEach((version,index)=>{version.number=index+1;});
  project.currentVersionId=project.versions.at(-1)?.id||snapshot.id;project.report=report;project.updatedAt=now;project.maturity=snapshot.maturity;project.profile=snapshot.profile;project.mode=snapshot.mode;
  project.timeline=Array.isArray(project.timeline)?project.timeline:[];project.timeline.push({id:uid(),type:'reanalysis_generated',at:now,meta:{version:snapshot.number,baseVersion:base?.number||1,score:nextScore,scoreDelta:snapshot.comparison.scoreDelta,evidenceCount:newEvidence.length}});
  if(project.timeline.length>120)project.timeline=project.timeline.slice(-120);
  return snapshot;
}
function showResult(project,report,snapshot){
  localStorage.setItem(ACTIVE_KEY,project.id);state.idea=project.idea||'';state.answers=project.answers||[];state.report=report;state.maturity=project.maturity||'unknown';state.profile=project.profile||'unknown';state.mode=project.mode||'unknown';
  renderReport(report);showView('report-view');setProgress(100,`${text().done} · v${snapshot.number}`);document.getElementById('workspace-modal')?.classList.add('hidden');document.getElementById('validator')?.scrollIntoView({behavior:'smooth'});
}
async function reanalyse(projectId,button){
  if(busyProjectId)return;syncProjectMemory();const project=getProjectMemory(projectId);if(!project)return;
  const base=latestVersion(project);const newEvidence=evidenceAfter(project,base);
  if(!newEvidence.length){alert(text().noEvidence);track('pro_reanalysis_blocked_no_evidence',{projectId});return;}
  if(!confirm(text().confirm))return;
  busyProjectId=projectId;const original=button.textContent;button.disabled=true;button.textContent=text().working;track('pro_reanalysis_started',{projectId,baseVersion:base?.number||1,evidenceCount:newEvidence.length});
  try{
    const report=await callEngine(project,base,newEvidence);const projects=read();const stored=projects.find(item=>item.id===projectId);if(!stored)throw new Error('project_missing');const storedBase=latestVersion(stored)||base;const snapshot=appendVersion(stored,storedBase,report,newEvidence);write(projects);syncProjectMemory();showResult(stored,report,snapshot);track('pro_reanalysis_completed',{projectId,version:snapshot.number,score:snapshot.score,scoreDelta:snapshot.comparison.scoreDelta,evidenceCount:newEvidence.length});
  }catch(error){console.error('atlas_reanalysis_failed',error);alert(text().failed);track('analysis_error',{errorCode:'incremental_reanalysis_failed'});}
  finally{busyProjectId=null;button.disabled=false;button.textContent=original;}
}
function enhance(){
  document.querySelectorAll('.workspace-card[data-project-id]').forEach(card=>{
    const actions=card.querySelector('.workspace-actions');if(!actions||actions.querySelector('[data-reanalyse-project]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.reanalyseProject='';button.textContent=text().button;button.addEventListener('click',event=>{event.stopPropagation();reanalyse(card.dataset.projectId,button);});actions.insertBefore(button,actions.firstChild?.nextSibling||null);
  });
}
export function initReanalysis(){
  if(observer)return;observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});enhance();window.addEventListener('atlas:locale',enhance);
}
