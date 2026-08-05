const $=(id)=>document.getElementById(id);
const state={idea:'',questions:[],answers:[],index:0,report:null};
const views=['start-view','question-view','loading-view','report-view'];
const loadingMessages=['Interpretando la información aportada…','Evaluando la calidad de la evidencia…','Identificando supuestos y riesgos…','Preparando el experimento de siete días…'];
let loadingTimer;

function show(id){views.forEach((view)=>$(view).classList.toggle('hidden',view!==id));}
function progress(value,label){$('progress-bar').style.width=`${Math.max(0,Math.min(100,value))}%`;$('progress-label').textContent=`${Math.round(value)} %`;if(label)$('step-label').textContent=label;}
function safeText(value){return typeof value==='string'?value.trim():'';}
function renderList(id,items){$(id).innerHTML=(Array.isArray(items)?items:[]).map((item)=>`<li>${escapeHtml(String(item))}</li>`).join('')||'<li>Sin datos suficientes.</li>';}
function escapeHtml(value){return value.replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
async function post(path,payload){const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});let data={};try{data=await response.json();}catch{}if(!response.ok)throw new Error(data.error||'No se pudo completar la solicitud.');return data;}
function track(name,data={}){post('/api/event',{name,data,version:'beta-3.0'}).catch(()=>{});}

async function start(){const idea=safeText($('idea').value);$('start-error').textContent='';if(idea.length<12){$('start-error').textContent='Describe la idea con un poco más de detalle.';return;}state.idea=idea;$('start-button').disabled=true;show('loading-view');progress(12,'Analizando idea');startLoading();track('validator_started');try{const result=await post('/api/analyze',{stage:'screen',idea,language:'es'});if(result.status==='blocked'||result.classification==='prohibited'){stopLoading();renderBlocked(result);return;}state.questions=Array.isArray(result.questions)&&result.questions.length?result.questions:fallbackQuestions();state.answers=[];state.index=0;stopLoading();renderQuestion();}catch(error){stopLoading();show('start-view');progress(0,'Paso 1 de 1');$('start-error').textContent=error.message;}finally{$('start-button').disabled=false;}}

function fallbackQuestions(){return[
 {question:'¿Quién es el cliente exacto y qué problema urgente tiene?',reason:'Claridad del cliente'},
 {question:'¿Qué evidencia real tienes de que ese problema existe?',reason:'Calidad de evidencia'},
 {question:'¿Cómo consiguen hoy los clientes resolverlo?',reason:'Alternativas actuales'},
 {question:'¿Cómo llegarías a tus primeros diez usuarios?',reason:'Distribución'},
 {question:'¿Qué señal medible demostraría que merece la pena continuar?',reason:'Criterio de validación'}
];}

function renderQuestion(){show('question-view');const total=state.questions.length;const question=state.questions[state.index]||{};$('question-title').textContent=question.question||question.text||'Cuéntanos un poco más';$('question-reason').textContent=question.reason||question.dimension||'Pregunta adaptada';$('answer').value='';progress(15+((state.index)/Math.max(1,total))*55,`Pregunta ${state.index+1} de ${total}`);$('answer').focus();}

async function answer(){const value=safeText($('answer').value);if(value.length<3){$('answer').focus();return;}state.answers.push({question:$('question-title').textContent,answer:value});state.index+=1;if(state.index<state.questions.length){renderQuestion();return;}show('loading-view');progress(78,'Preparando informe');startLoading();track('questionnaire_completed',{questions:state.questions.length});try{const report=await post('/api/analyze',{stage:'report',idea:state.idea,answers:state.answers,language:'es'});state.report=report;stopLoading();await revealReport();track('report_generated',{score:report.score,verdict:report.verdict});}catch(error){stopLoading();show('question-view');state.index=Math.max(0,state.questions.length-1);$('question-title').textContent='No se pudo generar el informe';$('question-reason').textContent=error.message;$('answer').classList.add('hidden');$('answer-button').textContent='Reintentar';}}

function startLoading(){let index=0;$('loading-copy').textContent=loadingMessages[index];clearInterval(loadingTimer);loadingTimer=setInterval(()=>{$('loading-copy').textContent=loadingMessages[++index%loadingMessages.length];},900);}
function stopLoading(){clearInterval(loadingTimer);}
async function revealReport(){progress(96,'Informe preparado');await new Promise((resolve)=>setTimeout(resolve,650));renderReport(state.report||{});show('report-view');progress(100,'Análisis completado');}
function renderReport(report){$('score').textContent=Number.isFinite(Number(report.score))?Math.round(Number(report.score)):'—';$('verdict').textContent=safeText(report.verdict)||'VALIDAR ANTES DE CONSTRUIR';$('summary').textContent=safeText(report.executiveSummary||report.summary)||'Atlas ha identificado qué deberías demostrar antes de invertir más tiempo.';renderList('strengths',report.strengths);renderList('risks',report.risks);renderList('assumptions',report.criticalAssumptions||report.assumptions);renderList('do-not-build',report.doNotBuildYet);const experiment=report.experiment||report.validationExperiment||{};$('experiment-name').textContent=safeText(experiment.name)||'Experimento de 7 días';renderList('experiment-steps',experiment.steps);}
function renderBlocked(result){show('report-view');progress(100,'Análisis detenido');$('score').textContent='0';$('verdict').textContent='IDEA NO EVALUABLE';$('summary').textContent=safeText(result.reason)||'Atlas no analiza ni proporciona planes para actividades ilegales o dañinas.';renderList('strengths',[]);renderList('risks',['La actividad descrita no puede recibir asistencia comercial.']);renderList('assumptions',[]);renderList('do-not-build',['No continúes con esta idea. Reformúlala hacia una actividad legal y segura.']);$('experiment-name').textContent='Siguiente paso seguro';renderList('experiment-steps',['Describe una alternativa legal que resuelva un problema real sin causar daño.']);track('screening_blocked');}
function reset(){state.idea='';state.questions=[];state.answers=[];state.index=0;state.report=null;$('idea').value='';$('answer').classList.remove('hidden');$('answer-button').textContent='Continuar';show('start-view');progress(0,'Paso 1 de 1');$('idea').focus();track('restart_clicked');}
async function share(){const report=state.report||{};const text=`Atlas — ${report.verdict||'Informe de validación'}\nPuntuación: ${report.score??'—'}/100\n${report.executiveSummary||report.summary||''}`;try{if(navigator.share)await navigator.share({title:'Atlas Validation Report',text,url:location.href});else{await navigator.clipboard.writeText(`${text}\n${location.href}`);$('share-button').textContent='Copiado';setTimeout(()=>$('share-button').textContent='Compartir',1500);}track('report_shared');}catch{}}
function printReport(){track('pdf_downloaded');window.print();}

$('start-button').addEventListener('click',start);
$('answer-button').addEventListener('click',answer);
$('restart-button').addEventListener('click',reset);
$('new-analysis-button').addEventListener('click',reset);
$('share-button').addEventListener('click',share);
$('pdf-button').addEventListener('click',printReport);
$('idea').addEventListener('keydown',(event)=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter')start();});
$('answer').addEventListener('keydown',(event)=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter')answer();});
track('landing_view');
