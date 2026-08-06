import { getLocale } from './i18n.js';
import { renderReport } from './report.js';
import { state } from './state.js';
import { setProgress, showView } from './ui.js';

const STORAGE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';
const MAX_VERSIONS=20;
let running=false;
let controller=null;

const text=()=>getLocale()==='en'?{
  button:'Reanalyse',working:'Reanalysing…',confirm:'Reanalyse this project using the evidence added since the previous report?',none:'Add or edit evidence before reanalysing.',failed:'The reanalysis could not be completed. Your previous report is unchanged.',preparing:'Preparing project memory…',reviewing:'Reviewing new evidence…',done:'Reanalysis completed'
}:{
  button:'Reanalizar',working:'Reanalizando…',confirm:'¿Reanalizar este proyecto usando las evidencias añadidas desde el informe anterior?',none:'Añade o edita una evidencia antes de reanalizar.',failed:'No se pudo completar el reanálisis. Tu informe anterior no ha cambiado.',preparing:'Preparando la memoria del proyecto…',reviewing:'Revisando las evidencias nuevas…',done:'Reanálisis completado'
};

function clone(value){return typeof globalThis.structuredClone==='function'?globalThis.structuredClone(value):JSON.parse(JSON.stringify(value));}
function readProjects(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(data)?data:[];}catch{return[];}}
function writeProjects(projects){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));}
function stableEvidence(evidence=[]){return evidence.map(item=>({id:item.id||'',category:item.category||'',impact:item.impact||'neutral',description:String(item.description||'').trim(),link:String(item.link||'').trim(),createdAt:item.createdAt||'',updatedAt:item.updatedAt||''})).sort((a,b)=>String(a.id).localeCompare(String(b.id)));}
function signature(evidence=[]){const value=JSON.stringify(stableEvidence(evidence));let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16);}
function compactReport(report={}){return{score:report.score,verdict:report.verdict,executiveSummary:report.executiveSummary||report.summary||'',strengths:Array.isArray(report.strengths)?report.strengths.slice(0,8):[],risks:Array.isArray(report.risks)?report.risks.slice(0,8):[],criticalAssumptions:Array.isArray(report.criticalAssumptions)?report.criticalAssumptions.slice(0,8):(Array.isArray(report.assumptions)?report.assumptions.slice(0,8):[]),scoreBreakdown:report.scoreBreakdown||{}};}
function newEvidence(project){const current=stableEvidence(project.evidence||[]);const used=Array.isArray(project.reanalysis?.lastEvidence)?project.reanalysis.lastEvidence:[];const usedMap=new Map(used.map(item=>[item.id,JSON.stringify(item)]));return current.filter(item=>usedMap.get(item.id)!==JSON.stringify(item));}
function validReport(report){return report&&typeof report==='object'&&Number.isFinite(Number(report.score))&&typeof report.verdict==='string';}
function addVersion(project,report,label){project.versions=Array.isArray(project.versions)?project.versions:[];const version={id:`v-${Date.now()}-${Math.random().toString(16).slice(2)}`,number:project.versions.length+1,createdAt:new Date().toISOString(),label,report:clone(report),evidence:stableEvidence(project.evidence||[])};project.versions.push(version);if(project.versions.length>MAX_VERSIONS)project.versions=project.versions.slice(-MAX_VERSIONS);return version;}
function ensureBaseVersion(project){if(!Array.isArray(project.versions)||!project.versions.length)addVersion(project,project.report||{},'base');}
function addTimeline(project,report){project.timeline=Array.isArray(project.timeline)?project.timeline:[];project.timeline.push({id:`event-${Date.now()}-${Math.random().toString(16).slice(2)}`,type:'analysis_generated',at:new Date().toISOString(),meta:{score:Number(report.score)||0,reanalysis:true,version:(project.versions?.length||0)+1}});if(project.timeline.length>120)project.timeline=project.timeline.slice(-120);}
function answersFor(project,evidence){const original=Array.isArray(project.answers)?project.answers.slice(0,30):[];const previous=compactReport(project.report||{});const evidenceText=evidence.map((item,index)=>`${index+1}. [${item.category}/${item.impact}] ${item.description}${item.link?` (${item.link})`:''}`).join('\n');return[...original,{question:'ATLAS_PREVIOUS_REPORT',answer:JSON.stringify(previous)},{question:'ATLAS_NEW_EVIDENCE',answer:evidenceText},{question:'ATLAS_INCREMENTAL_INSTRUCTION',answer:'This is an incremental reanalysis. Compare the new evidence with the previous report. Do not claim there is no new evidence. Update score, verdict, risks and next experiment conservatively. Never invent facts.'}];}
async function requestReport(project,evidence){controller?.abort();controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);try{const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,body:JSON.stringify({stage:'report',idea:project.idea||project.name||'',answers:answersFor(project,evidence),language:getLocale(),locale:getLocale(),previousReport:compactReport(project.report||{}),evidence})});const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw new Error('Invalid JSON');}if(!response.ok)throw new Error(data?.error||`HTTP ${response.status}`);return data;}finally{clearTimeout(timeout);controller=null;}}
function closeWorkspace(){document.getElementById('workspace-modal')?.classList.add('hidden');document.body.style.overflow='';}
function clamp20(value){return Math.max(0,Math.min(20,Math.round(Number(value)||0)));}
function visibleBreakdown(report={}){const raw=report.scoreBreakdown||report.scoring||{};return[
  clamp20(raw.problemEvidence??raw.offerClarity),
  clamp20(raw.customerSpecificity??raw.customerProblemFit),
  clamp20(raw.paymentEvidence??raw.economicPlausibility),
  clamp20(raw.distributionFeasibility),
  clamp20(raw.deliveryEconomics??raw.validationReadiness)
];}
function repairEvidenceScore(report={}){const outputs=[...document.querySelectorAll('#atlas-33-insights .score-breakdown .score-row strong')];if(outputs.length!==5)return;visibleBreakdown(report).forEach((value,index)=>{outputs[index].textContent=`${value}/20`;});document.querySelector('#atlas-33-insights .score-breakdown')?.setAttribute('data-score-contract','atlas-evidence-v2');}
function restoreProjectView(project,label=text().done){state.idea=project.idea||'';state.answers=Array.isArray(project.answers)?project.answers:[];state.report=project.report||{};state.maturity=project.maturity||'unknown';state.profile=project.profile||'unknown';state.mode=project.mode||'unknown';renderReport(state.report);repairEvidenceScore(state.report);showView('report-view');setProgress(100,label);}
async function run(projectId,button){if(running)return;const copy=text();const projects=readProjects();const index=projects.findIndex(item=>item.id===projectId);if(index<0)return;const project=projects[index];const evidence=newEvidence(project);if(!evidence.length){alert(copy.none);return;}if(!confirm(copy.confirm))return;running=true;const original=button.textContent;button.disabled=true;button.textContent=copy.working;closeWorkspace();showView('loading-view');setProgress(84,copy.preparing);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));try{setProgress(91,copy.reviewing);const report=await requestReport(project,evidence);if(!validReport(report)||report.status==='blocked')throw new Error('Invalid report');ensureBaseVersion(project);addVersion(project,report,'reanalysis');addTimeline(project,report);project.report=report;project.updatedAt=new Date().toISOString();project.reanalysis={lastEvidence:stableEvidence(project.evidence||[]),lastEvidenceSignature:signature(project.evidence||[]),lastRunAt:project.updatedAt};projects[index]=project;writeProjects(projects);localStorage.setItem(ACTIVE_KEY,project.id);restoreProjectView(project);}catch(error){console.error('atlas_reanalysis_v2_failed',error);restoreProjectView(project,copy.failed);alert(copy.failed);}finally{running=false;button.disabled=false;button.textContent=original;}}
function enhanceWorkspace(){document.querySelectorAll('.workspace-card[data-project-id]').forEach(card=>{const actions=card.querySelector('.workspace-actions');if(!actions||actions.querySelector('[data-reanalysis-v2]'))return;const button=document.createElement('button');button.type='button';button.dataset.reanalysisV2='';button.textContent=text().button;button.addEventListener('click',event=>{event.stopPropagation();run(card.dataset.projectId,button);});actions.insertBefore(button,actions.children[1]||null);});}
function scheduleEnhance(){setTimeout(enhanceWorkspace,0);setTimeout(enhanceWorkspace,120);}

document.addEventListener('click',event=>{if(event.target.closest('.workspace-open,[data-workspace-close],.workspace-back,[data-action]'))scheduleEnhance();});
window.addEventListener('atlas:locale',scheduleEnhance);
window.addEventListener('pagehide',()=>controller?.abort());
scheduleEnhance();
