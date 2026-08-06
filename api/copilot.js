const UPSTREAM='https://atlas-validator.vercel.app/api/analyze';
const PROTECTIVE_CONTEXT=/\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|anti[- ]?fraude|educacion|auditoria|cumplimiento|mitigar|prevent|protect|detect|defend|security|cybersecurity|anti[- ]?fraud|education|audit|compliance|mitigate)\b/i;
const PROHIBITED_PATTERNS=[/\bsim\s*swap(?:ping)?\b/i,/\bphishing\s*(?:kit|service|as a service)?\b/i,/\brobo\s+de\s+credenciales\b/i,/\bcredential\s+(?:theft|stealing|harvesting)\b/i,/\bcarding\b/i,/\bransomware\s*(?:as a service|service)?\b/i,/\bmalware\s*(?:as a service|service)?\b/i,/\brobo\s+de\s+identidad\b/i,/\bidentity\s+theft\b/i,/\bresucitar\s+eta\b/i,/\bgrupo\s+terrorista\b/i,/\bterrorist\s+group\b/i];
const clean=value=>String(value||'').trim();
const array=value=>Array.isArray(value)?value:[];
const localeOf=body=>body.locale==='en'||body.language==='en'?'en':'es';
function prohibited(text){const value=clean(text);return PROHIBITED_PATTERNS.some(pattern=>pattern.test(value))&&!PROTECTIVE_CONTEXT.test(value);}
function compact(value,max=900){return clean(value).slice(0,max);}
function compactList(value,maxItems=6,maxChars=500){return array(value).slice(0,maxItems).map(item=>compact(typeof item==='string'?item:JSON.stringify(item),maxChars)).filter(Boolean);}
function contextAnswers(body,locale){const project=body.project||{};const report=project.report||{};const versions=array(project.versions).slice(-5).map(version=>({number:version.number,createdAt:version.createdAt,score:version.report?.score,verdict:version.report?.verdict,summary:compact(version.report?.executiveSummary||version.report?.summary,500)}));const evidence=array(project.evidence).slice(-20).map(item=>({category:item.category,impact:item.impact,description:compact(item.description,500),link:compact(item.link,200),updatedAt:item.updatedAt||item.createdAt}));const timeline=array(project.timeline).slice(-20).map(item=>({type:item.type,at:item.at,meta:item.meta||{}}));const history=array(body.history).slice(-8).map(item=>({role:item.role==='assistant'?'assistant':'user',content:compact(item.content,700)}));const instruction=locale==='en'
?'You are Atlas Copilot, a contextual business validation advisor. Answer the user question directly using only the supplied project context. Never invent evidence, customers, revenue, metrics or decisions. Clearly distinguish facts, inferences and missing information. Give concise reasoning and at most three practical next actions. Do not rewrite the whole report. Return JSON in the normal Atlas report schema. Put the conversational answer in executiveSummary and the suggested next actions in recommendations.'
:'Eres Copiloto Atlas, un asesor contextual de validación de negocios. Responde directamente a la pregunta usando únicamente el contexto suministrado del proyecto. Nunca inventes evidencias, clientes, ingresos, métricas ni decisiones. Distingue con claridad hechos, inferencias e información ausente. Ofrece razonamiento breve y un máximo de tres acciones prácticas. No reescribas todo el informe. Devuelve JSON con el esquema normal de informe Atlas. Coloca la respuesta conversacional en executiveSummary y las siguientes acciones en recommendations.';
return[
{question:'ATLAS_COPILOT_INSTRUCTION',answer:instruction},
{question:'PROJECT_IDENTITY',answer:JSON.stringify({name:compact(project.name,150),idea:compact(project.idea,1800),maturity:project.maturity,profile:project.profile,mode:project.mode})},
{question:'CURRENT_REPORT',answer:JSON.stringify({score:report.score,verdict:report.verdict,executiveSummary:compact(report.executiveSummary||report.summary,1200),strengths:compactList(report.strengths),risks:compactList(report.risks),criticalAssumptions:compactList(report.criticalAssumptions||report.assumptions),doNotBuildYet:compactList(report.doNotBuildYet),recommendations:compactList(report.recommendations)})},
{question:'PROJECT_EVIDENCE',answer:JSON.stringify(evidence)},
{question:'PROJECT_VERSIONS',answer:JSON.stringify(versions)},
{question:'PROJECT_TIMELINE',answer:JSON.stringify(timeline)},
{question:'CHAT_HISTORY',answer:JSON.stringify(history)},
{question:'USER_QUESTION',answer:compact(body.message,1200)}
];}
export default async function handler(req,res){
if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
const body=req.body||{};const locale=localeOf(body);const message=clean(body.message);
if(!message)return res.status(400).json({error:locale==='en'?'Write a question first.':'Escribe una pregunta primero.'});
if(prohibited(message))return res.status(200).json({status:'blocked',answer:locale==='en'?'Atlas cannot help plan illegal or harmful activity. I can help assess prevention, compliance, risks or defensive measures.':'Atlas no puede ayudar a planificar actividades ilegales o dañinas. Sí puedo ayudarte a evaluar prevención, cumplimiento, riesgos o medidas defensivas.'});
const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),50000);
try{
const upstream=await fetch(UPSTREAM,{method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,body:JSON.stringify({mode:'report',stage:'report',idea:compact(body.project?.idea||body.project?.name,2200),answers:contextAnswers(body,locale),language:locale,locale})});
const raw=await upstream.text();let data;try{data=JSON.parse(raw);}catch{return res.status(502).json({error:locale==='en'?'Atlas returned an invalid response.':'Atlas devolvió una respuesta no válida.'});}
if(!upstream.ok)return res.status(upstream.status).json({error:data?.error||'Copilot request failed'});
if(data?.status==='blocked')return res.status(200).json({status:'blocked',answer:data.reason});
const answer=clean(data?.executiveSummary||data?.summary);const actions=compactList(data?.recommendations,3,500);
if(!answer)return res.status(502).json({error:locale==='en'?'Atlas could not form a grounded answer.':'Atlas no pudo formar una respuesta fundamentada.'});
return res.status(200).json({status:'ok',answer,actions,grounded:true});
}catch(error){const timedOut=error?.name==='AbortError';return res.status(timedOut?504:500).json({error:timedOut?(locale==='en'?'The Copilot took too long. Try a shorter question.':'El Copiloto tardó demasiado. Prueba con una pregunta más breve.'):(locale==='en'?'The Copilot could not respond.':'El Copiloto no pudo responder.')});}finally{clearTimeout(timeout);}
}
