const UPSTREAM = "https://atlas-validator.vercel.app/api/analyze";

const MODE_BY_STAGE = { screen: "questions", report: "report" };
const PROTECTIVE_CONTEXT = /\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|anti[- ]?fraude|concienciacion|educacion|auditoria|cumplimiento|mitigar|mitigacion|prevent|protect|detect|defend|defense|security|cybersecurity|anti[- ]?fraud|awareness|education|audit|compliance|mitigate)\b/i;
const PROHIBITED_PATTERNS = [/\bsim\s*swap(?:ping)?\b/i,/\bduplicar\s+(?:una\s+)?sim\b/i,/\brobar\s+(?:una\s+)?linea\s+(?:movil|telefonica)\b/i,/\bsecuestr(?:ar|o)\s+(?:una\s+)?linea\s+(?:movil|telefonica)\b/i,/\bphishing\s*(?:kit|service|as a service)?\b/i,/\brobo\s+de\s+credenciales\b/i,/\bcredential\s+(?:theft|stealing|harvesting)\b/i,/\bcarding\b/i,/\bransomware\s*(?:as a service|service)?\b/i,/\bmalware\s*(?:as a service|service)?\b/i,/\brobo\s+de\s+identidad\b/i,/\bidentity\s+theft\b/i];

function normalizeText(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function requestText(body){const answerText=Array.isArray(body.answers)?body.answers.map(item=>`${item?.question||""} ${item?.answer||""}`).join(" "):"";return normalizeText(`${body.idea||""} ${answerText}`);}
function isLocallyProhibited(body){const text=requestText(body);return PROHIBITED_PATTERNS.some(pattern=>pattern.test(text))&&!PROTECTIVE_CONTEXT.test(text);}
function requestedLocale(body){return body.locale==='en'||body.language==='en'||body.language==='English'?'en':'es';}
function blockedResponse(locale){return locale==='en'?{status:'blocked',classification:'prohibited',reason:'Atlas does not analyze or provide plans for fraud, impersonation, credential theft or telecommunications abuse.'}:{status:'blocked',classification:'prohibited',reason:'Atlas no analiza ni proporciona planes para fraude, suplantación, robo de credenciales o abuso de telecomunicaciones.'};}
function asArray(value){return Array.isArray(value)?value.filter(Boolean):[];}
function clean(value){return String(value||'').trim();}
function clampScore(value){const number=Number(value);return Number.isFinite(number)?Math.max(0,Math.min(100,Math.round(number))):null;}

function languageDirective(locale){return locale==='en'
  ? 'MANDATORY OUTPUT LANGUAGE: ENGLISH ONLY. Write every question, reason, verdict, summary, list item, contradiction and experiment field in natural English. Never answer in Spanish or mix languages.'
  : 'IDIOMA OBLIGATORIO DE SALIDA: SOLO ESPAÑOL. Escribe cada pregunta, motivo, veredicto, resumen, elemento de lista, contradicción y campo del experimento en español natural. Nunca respondas en inglés ni mezcles idiomas.';}

function questionsDirective(locale){return locale==='en'?`
ATLAS BETA 3.3 — QUESTION QUALITY CONTRACT
Generate exactly 7 concise, non-overlapping questions tailored to this specific idea.
Each question must request observable evidence, a number, a named behavior, a real example or a falsifiable claim. Never ask for motivation, enthusiasm or generic opinions.
Cover these dimensions once each: target customer; painful current behavior; existing alternatives; willingness to pay; acquisition/distribution; delivery economics; smallest falsifiable test.
Order questions by information value. Use prior idea details and do not ask for information already supplied.
Return JSON only: {"questions":[{"question":"...","reason":"...","dimension":"customer|problem|alternative|payment|distribution|economics|validation"}]}.
`: `
ATLAS BETA 3.3 — CONTRATO DE CALIDAD DE PREGUNTAS
Genera exactamente 7 preguntas breves, no solapadas y adaptadas a esta idea concreta.
Cada pregunta debe pedir evidencia observable, una cifra, una conducta identificable, un ejemplo real o una afirmación falsable. Nunca preguntes por motivación, entusiasmo u opiniones genéricas.
Cubre una sola vez estas dimensiones: cliente objetivo; conducta dolorosa actual; alternativas existentes; disposición a pagar; adquisición/distribución; economía de entrega; prueba falsable mínima.
Ordena las preguntas por valor informativo. Aprovecha lo ya descrito y no repitas información aportada.
Devuelve solo JSON: {"questions":[{"question":"...","reason":"...","dimension":"customer|problem|alternative|payment|distribution|economics|validation"}]}.
`;}

function reportDirective(locale){return locale==='en'?`
ATLAS BETA 3.3 — DECISION REPORT CONTRACT
Act as a rigorous product discovery analyst. Treat every unsupported claim as an assumption, never as evidence.
First compare all answers with the original idea and identify contradictions, vague claims, invented precision and missing evidence.
Score with this fixed rubric (0-20 each): problem evidence, customer specificity, willingness-to-pay evidence, distribution feasibility, delivery/economic feasibility. The total score must equal the five components. Missing evidence scores 0-5; stated assumptions without proof score 6-10; weak real signals score 11-15; repeated or paid evidence scores 16-20.
Verdict thresholds: 0-34 DISCARD; 35-54 REFRAME AND TEST; 55-74 VALIDATE BEFORE BUILDING; 75-100 PROCEED WITH CAUTION. A high score is impossible without real payment or repeated behavioral evidence.
Recommendations must be specific, measurable and directly tied to the highest-risk assumption.
The experiment must be a genuine seven-day plan. It must contain exactly 7 day objects and must be useful even when evidence is missing—the purpose is then to collect that evidence. Never output “insufficient evidence” as an experiment step.
Return JSON only with this exact shape:
{"score":0,"scoreBreakdown":{"problemEvidence":0,"customerSpecificity":0,"paymentEvidence":0,"distributionFeasibility":0,"deliveryEconomics":0},"verdict":"...","executiveSummary":"...","strengths":["..."],"risks":["..."],"criticalAssumptions":["..."],"contradictions":["..."],"doNotBuildYet":["..."],"recommendations":["..."],"experiment":{"name":"...","hypothesis":"...","target":"...","metric":"...","successThreshold":"...","failureThreshold":"...","decisionIfSuccess":"...","decisionIfFailure":"...","days":[{"day":1,"action":"...","deliverable":"..."},{"day":2,"action":"...","deliverable":"..."},{"day":3,"action":"...","deliverable":"..."},{"day":4,"action":"...","deliverable":"..."},{"day":5,"action":"...","deliverable":"..."},{"day":6,"action":"...","deliverable":"..."},{"day":7,"action":"...","deliverable":"..."}],"steps":["..."]}}.
`: `
ATLAS BETA 3.3 — CONTRATO DEL INFORME DE DECISIÓN
Actúa como analista riguroso de descubrimiento de producto. Trata toda afirmación sin respaldo como supuesto, nunca como evidencia.
Compara primero todas las respuestas con la idea original e identifica contradicciones, vaguedades, precisión inventada y evidencia ausente.
Puntúa con esta rúbrica fija (0-20 cada dimensión): evidencia del problema, especificidad del cliente, evidencia de pago, viabilidad de distribución y viabilidad económica/de entrega. La puntuación total debe ser la suma de las cinco dimensiones. Evidencia ausente puntúa 0-5; supuestos declarados sin prueba 6-10; señales reales débiles 11-15; evidencia repetida o de pago 16-20.
Umbrales: 0-34 DESCARTAR; 35-54 REFORMULAR Y PROBAR; 55-74 VALIDAR ANTES DE CONSTRUIR; 75-100 AVANZAR CON CAUTELA. No puede existir una puntuación alta sin pagos reales o evidencia conductual repetida.
Las recomendaciones deben ser específicas, medibles y vinculadas al supuesto de mayor riesgo.
El experimento debe ser un plan real de siete días. Debe contener exactamente 7 objetos de día y ser útil incluso cuando falte evidencia: en ese caso su objetivo será obtenerla. Nunca uses “sin datos suficientes” como paso del experimento.
Devuelve solo JSON con esta forma exacta:
{"score":0,"scoreBreakdown":{"problemEvidence":0,"customerSpecificity":0,"paymentEvidence":0,"distributionFeasibility":0,"deliveryEconomics":0},"verdict":"...","executiveSummary":"...","strengths":["..."],"risks":["..."],"criticalAssumptions":["..."],"contradictions":["..."],"doNotBuildYet":["..."],"recommendations":["..."],"experiment":{"name":"...","hypothesis":"...","target":"...","metric":"...","successThreshold":"...","failureThreshold":"...","decisionIfSuccess":"...","decisionIfFailure":"...","days":[{"day":1,"action":"...","deliverable":"..."},{"day":2,"action":"...","deliverable":"..."},{"day":3,"action":"...","deliverable":"..."},{"day":4,"action":"...","deliverable":"..."},{"day":5,"action":"...","deliverable":"..."},{"day":6,"action":"...","deliverable":"..."},{"day":7,"action":"...","deliverable":"..."}],"steps":["..."]}}.
`;}

function fallbackQuestions(locale){return locale==='en'?
[
{question:'Who is the first narrowly defined customer, and what observable trait makes them reachable?',reason:'A specific segment makes evidence interpretable.',dimension:'customer'},
{question:'What did this customer do the last time the problem occurred, and what did it cost in time or money?',reason:'Recent behavior is stronger than stated interest.',dimension:'problem'},
{question:'Which alternative do they use now, and why is it still inadequate?',reason:'Existing alternatives reveal urgency and switching friction.',dimension:'alternative'},
{question:'What payment, preorder, budget commitment or comparable purchase supports willingness to pay?',reason:'Payment evidence separates demand from politeness.',dimension:'payment'},
{question:'Which exact channel can reach the first 20 prospects, and what evidence supports that channel?',reason:'A viable idea still fails without distribution.',dimension:'distribution'},
{question:'What does one customer cost to acquire and serve, using your best explicit assumptions?',reason:'Basic economics expose hidden delivery constraints.',dimension:'economics'},
{question:'What result within seven days would make you continue, and what result would make you stop or reframe?',reason:'A falsifiable threshold turns activity into learning.',dimension:'validation'}
]:[
{question:'¿Quién es el primer cliente definido de forma estrecha y qué rasgo observable permite localizarlo?',reason:'Un segmento concreto hace interpretable la evidencia.',dimension:'customer'},
{question:'¿Qué hizo ese cliente la última vez que sufrió el problema y cuánto le costó en tiempo o dinero?',reason:'La conducta reciente vale más que el interés declarado.',dimension:'problem'},
{question:'¿Qué alternativa utiliza ahora y por qué sigue siendo insuficiente?',reason:'Las alternativas revelan urgencia y fricción de cambio.',dimension:'alternative'},
{question:'¿Qué pago, preventa, compromiso presupuestario o compra comparable demuestra disposición a pagar?',reason:'La evidencia de pago separa demanda de cortesía.',dimension:'payment'},
{question:'¿Qué canal exacto permite contactar a los primeros 20 prospectos y qué evidencia respalda ese canal?',reason:'Una buena idea también falla sin distribución.',dimension:'distribution'},
{question:'¿Cuánto cuesta captar y atender a un cliente usando tus supuestos explícitos más razonables?',reason:'La economía básica revela restricciones ocultas.',dimension:'economics'},
{question:'¿Qué resultado en siete días te haría continuar y cuál te obligaría a detenerte o reformular?',reason:'Un umbral falsable convierte actividad en aprendizaje.',dimension:'validation'}
];}

function normalizeQuestions(data,locale){const source=asArray(data?.questions);const seen=new Set();const normalized=[];for(const item of source){const question=clean(item?.question||item?.text);if(!question)continue;const key=normalizeText(question);if(seen.has(key))continue;seen.add(key);normalized.push({question,reason:clean(item?.reason||item?.dimension),dimension:clean(item?.dimension)});}const fallbacks=fallbackQuestions(locale);for(const item of fallbacks){if(normalized.length>=7)break;if(!seen.has(normalizeText(item.question)))normalized.push(item);}return {questions:normalized.slice(0,7)};}

function scoreBreakdown(report){const raw=report?.scoreBreakdown||report?.scoring||{};const keys=['problemEvidence','customerSpecificity','paymentEvidence','distributionFeasibility','deliveryEconomics'];const values={};for(const key of keys)values[key]=Math.max(0,Math.min(20,Number(raw[key])||0));const total=Math.round(keys.reduce((sum,key)=>sum+values[key],0));return {values,total};}
function verdictFor(score,locale){if(locale==='en'){if(score<35)return'DISCARD';if(score<55)return'REFRAME AND TEST';if(score<75)return'VALIDATE BEFORE BUILDING';return'PROCEED WITH CAUTION';}if(score<35)return'DESCARTAR';if(score<55)return'REFORMULAR Y PROBAR';if(score<75)return'VALIDAR ANTES DE CONSTRUIR';return'AVANZAR CON CAUTELA';}
function genericDays(locale){return locale==='en'?
[
{day:1,action:'Write one falsifiable hypothesis about the highest-risk assumption.',deliverable:'One sentence with customer, behavior and expected result.'},
{day:2,action:'Build a list of 20 narrowly matched prospects.',deliverable:'A prospect list with the matching criterion recorded.'},
{day:3,action:'Prepare a manual offer that can be delivered without building the product.',deliverable:'A one-page offer with price and clear call to action.'},
{day:4,action:'Contact the first 10 prospects and ask for a concrete commitment.',deliverable:'Ten messages sent and responses logged.'},
{day:5,action:'Contact the remaining 10 prospects and run short problem interviews.',deliverable:'At least five completed conversations or documented refusals.'},
{day:6,action:'Ask qualified prospects for payment, preorder or a scheduled paid pilot.',deliverable:'Recorded yes/no payment decisions.'},
{day:7,action:'Compare results with the success and failure thresholds and decide.',deliverable:'A written continue, reframe or stop decision supported by counts.'}
]:[
{day:1,action:'Redacta una hipótesis falsable sobre el supuesto de mayor riesgo.',deliverable:'Una frase con cliente, conducta y resultado esperado.'},
{day:2,action:'Construye una lista de 20 prospectos que encajen de forma estricta.',deliverable:'Lista de prospectos con el criterio de encaje registrado.'},
{day:3,action:'Prepara una oferta manual que puedas entregar sin construir el producto.',deliverable:'Oferta de una página con precio y llamada a la acción.'},
{day:4,action:'Contacta a los primeros 10 prospectos y pide un compromiso concreto.',deliverable:'Diez mensajes enviados y respuestas registradas.'},
{day:5,action:'Contacta a los otros 10 y realiza entrevistas breves sobre el problema.',deliverable:'Al menos cinco conversaciones o rechazos documentados.'},
{day:6,action:'Pide a los prospectos cualificados un pago, preventa o piloto pagado.',deliverable:'Decisiones de pago afirmativas o negativas registradas.'},
{day:7,action:'Compara los resultados con los umbrales y toma una decisión.',deliverable:'Decisión escrita de continuar, reformular o parar apoyada en cifras.'}
];}
function normalizeDays(experiment,locale){const source=asArray(experiment?.days);const days=source.map((item,index)=>({day:Number(item?.day)||index+1,action:clean(item?.action||item?.task||item),deliverable:clean(item?.deliverable||item?.output)})).filter(item=>item.action);const fallback=genericDays(locale);for(let i=days.length;i<7;i++)days.push(fallback[i]);return days.slice(0,7).map((item,index)=>({...item,day:index+1}));}
function normalizeReport(data,locale){const breakdown=scoreBreakdown(data);let score=clampScore(data?.score);if(Object.values(breakdown.values).some(value=>value>0))score=breakdown.total;if(score===null)score=0;const experiment=data?.experiment||data?.validationExperiment||{};const days=normalizeDays(experiment,locale);const steps=days.map(item=>locale==='en'?`Day ${item.day}: ${item.action} Deliverable: ${item.deliverable}`:`Día ${item.day}: ${item.action} Entregable: ${item.deliverable}`);return {...data,score,scoreBreakdown:breakdown.values,verdict:verdictFor(score,locale),executiveSummary:clean(data?.executiveSummary||data?.summary)||(locale==='en'?'The available evidence is not yet sufficient for a confident build decision.':'La evidencia disponible todavía no permite tomar una decisión de construcción con confianza.'),strengths:asArray(data?.strengths),risks:asArray(data?.risks),criticalAssumptions:asArray(data?.criticalAssumptions||data?.assumptions),contradictions:asArray(data?.contradictions),doNotBuildYet:asArray(data?.doNotBuildYet),recommendations:asArray(data?.recommendations),experiment:{...experiment,name:clean(experiment?.name)||(locale==='en'?'7-day evidence test':'Prueba de evidencia de 7 días'),hypothesis:clean(experiment?.hypothesis),target:clean(experiment?.target),metric:clean(experiment?.metric),successThreshold:clean(experiment?.successThreshold),failureThreshold:clean(experiment?.failureThreshold),decisionIfSuccess:clean(experiment?.decisionIfSuccess),decisionIfFailure:clean(experiment?.decisionIfFailure),days,steps}};}

async function callUpstream(body){const response=await fetch(UPSTREAM,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await response.text();let data;try{data=JSON.parse(text);}catch{throw new Error('invalid_upstream_json');}return {status:response.status,data};}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const body={...req.body};const locale=requestedLocale(body);
    if(isLocallyProhibited(body))return res.status(200).json(blockedResponse(locale));
    if(!body.mode&&body.stage)body.mode=MODE_BY_STAGE[body.stage];delete body.stage;
    if(!body.mode)return res.status(400).json({error:locale==='en'?'Invalid mode':'Modo inválido'});
    const directive=languageDirective(locale);const quality=body.mode==='questions'?questionsDirective(locale):reportDirective(locale);
    body.language=locale;body.locale=locale;body.outputLanguage=locale==='en'?'English':'Spanish';body.languageInstruction=directive;body.atlasVersion='3.3';
    body.idea=`${clean(body.idea)}\n\n[${directive}]\n${quality}`;
    const upstream=await callUpstream(body);
    if(upstream.status>=400)return res.status(upstream.status).json(upstream.data);
    const result=body.mode==='questions'?normalizeQuestions(upstream.data,locale):normalizeReport(upstream.data,locale);
    return res.status(200).json(result);
  }catch(error){
    return res.status(502).json({error:error?.message==='invalid_upstream_json'?(req.body?.locale==='en'?'Invalid response from analysis engine':'Respuesta inválida del motor de análisis'):'Atlas could not complete the analysis. Please try again.'});
  }
}
