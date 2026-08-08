const UPSTREAM = 'https://atlas-validator.vercel.app/api/analyze';
const MODE_BY_STAGE = { screen: 'questions', report: 'report' };

const PROTECTIVE_CONTEXT = /\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|anti[- ]?fraude|educacion|auditoria|cumplimiento|mitigar|prevent|protect|detect|defend|security|cybersecurity|anti[- ]?fraud|education|audit|compliance|mitigate)\b/i;
const PROHIBITED_PATTERNS = [/\bsim\s*swap(?:ping)?\b/i,/\bphishing\s*(?:kit|service|as a service)?\b/i,/\brobo\s+de\s+credenciales\b/i,/\bcredential\s+(?:theft|stealing|harvesting)\b/i,/\bcarding\b/i,/\bransomware\s*(?:as a service|service)?\b/i,/\bmalware\s*(?:as a service|service)?\b/i,/\brobo\s+de\s+identidad\b/i,/\bidentity\s+theft\b/i];
const HISTORICAL_QUESTION = /\b(cu[aá]nt(?:o|os|as).*vend|ventas del mes pasado|clientes actuales|facturaci[oó]n actual|retenci[oó]n|churn|mrr|arr|how many.*sold|last month.*sales|current customers|current revenue|retention|churn)\b/i;

const clean = value => String(value || '').trim();
const array = value => Array.isArray(value) ? value.filter(Boolean) : [];
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const localeOf = body => body.locale === 'en' || body.language === 'en' || body.language === 'English' ? 'en' : 'es';

function requestText(body) {
  const answers = array(body.answers).map(item => `${item?.question || ''} ${item?.answer || ''}`).join(' ');
  return normalize(`${body.idea || ''} ${answers}`);
}
function isProhibited(body) {
  const text = requestText(body);
  return PROHIBITED_PATTERNS.some(pattern => pattern.test(text)) && !PROTECTIVE_CONTEXT.test(text);
}
function blocked(locale) {
  return locale === 'en'
    ? { status: 'blocked', classification: 'prohibited', reason: 'Atlas does not analyze or provide plans for illegal or harmful activity.' }
    : { status: 'blocked', classification: 'prohibited', reason: 'Atlas no analiza ni proporciona planes para actividades ilegales o dañinas.' };
}

function inferMaturity(body) {
  const text = requestText(body);
  if (/\b(vendo|vendemos|clientes actuales|facturo|facturamos|ingresos mensuales|ventas mensuales|mrr|arr|churn|retencion|we sell|current customers|monthly revenue|monthly sales|retention)\b/i.test(text)) return 'operating';
  if (/\b(prototipo|landing|entrevist|preventa|piloto|lista de espera|primeros clientes|primeras ventas|mvp|prototype|interview|preorder|pilot|waitlist|first customers|first sales)\b/i.test(text)) return 'testing';
  if (/\b(proveedor|inventario|presupuesto|precio estimado|canal|perfil de cliente|supplier|inventory|budget|estimated price|channel|customer profile)\b/i.test(text)) return 'preparing';
  return 'idea';
}

function inferProfile(body) {
  const text = requestText(body);
  const profiles = [
    ['resale', /\b(vinted|wallapop|reventa|revender|segunda mano|thrift|resell|resale|second.hand)\b/i],
    ['marketplace', /\b(marketplace|plataforma que conecta|conectar .* con|two.sided|oferta y demanda)\b/i],
    ['saas', /\b(saas|software|app|aplicaci[oó]n|suscripci[oó]n|dashboard|automatizar|api|platform software)\b/i],
    ['local', /\b(restaurante|cafeter[ií]a|peluquer[ií]a|gimnasio|tienda local|domicilio|barrio|local business|restaurant|salon|gym|neighborhood)\b/i],
    ['content', /\b(newsletter|curso|comunidad|podcast|contenido|membres[ií]a|creator|course|community|content|membership)\b/i],
    ['service', /\b(consultor[ií]a|agencia|freelance|servicio profesional|asesor[ií]a|consulting|agency|professional service|freelancer)\b/i],
    ['ecommerce', /\b(ecommerce|tienda online|shopify|dropshipping|marca de producto|online store|product brand)\b/i]
  ];
  return profiles.find(([, pattern]) => pattern.test(text))?.[0] || 'generic';
}

function inferMode(body, maturity) {
  if (maturity === 'idea' || maturity === 'preparing') return 'orientation';
  const text = requestText(body);
  const evidence = /\b(pago|pagaron|reserva|preventa|entrevist|clics|conversion|venta|clientes|payment|paid|booking|preorder|interview|clicks|conversion|sale|customers)\b/i;
  return evidence.test(text) ? 'validation' : 'orientation';
}

function languageRule(locale) {
  return locale === 'en' ? 'OUTPUT LANGUAGE: ENGLISH ONLY. Never mix languages.' : 'IDIOMA DE SALIDA: SOLO ESPAÑOL. Nunca mezcles idiomas.';
}

const PROFILE_GUIDANCE = {
  resale: {
    es: 'REVENTA: pregunta por nicho, acceso a inventario, criterio de selección, coste máximo por unidad, precio comparable, comisiones, logística, velocidad de publicación y tamaño del lote de prueba.',
    en: 'RESALE: ask about niche, inventory access, selection criteria, maximum unit cost, comparable prices, fees, logistics, listing capacity and test-batch size.'
  },
  service: {
    es: 'SERVICIOS: pregunta por cliente concreto, problema urgente, resultado prometido, alcance, capacidad de entrega, precio inicial, canal de captación y una oferta manual vendible.',
    en: 'SERVICES: ask about the specific client, urgent problem, promised outcome, scope, delivery capacity, initial price, acquisition channel and a sellable manual offer.'
  },
  saas: {
    es: 'SAAS: pregunta por flujo de trabajo actual, frecuencia del problema, usuario y comprador, alternativa manual, acceso a usuarios, precio plausible y prueba sin construir software.',
    en: 'SAAS: ask about the current workflow, problem frequency, user and buyer, manual alternative, access to users, plausible price and a test without building software.'
  },
  marketplace: {
    es: 'MARKETPLACE: pregunta por lado inicial, problema de liquidez, oferta mínima, demanda inicial, confianza, transacción manual y cómo evitar construir antes de demostrar intercambios.',
    en: 'MARKETPLACE: ask which side starts first, liquidity risk, minimum supply, initial demand, trust, manual transactions and how to prove exchanges before building.'
  },
  local: {
    es: 'NEGOCIO LOCAL: pregunta por zona, cliente, frecuencia, capacidad, costes fijos evitables, ticket, captación local y una prueba en un área pequeña.',
    en: 'LOCAL BUSINESS: ask about area, customer, frequency, capacity, avoidable fixed costs, ticket size, local acquisition and a small-area test.'
  },
  content: {
    es: 'CONTENIDO/COMUNIDAD: pregunta por audiencia estrecha, transformación, hábito actual, acceso, formato, cadencia sostenible, disposición a pagar y una edición piloto.',
    en: 'CONTENT/COMMUNITY: ask about narrow audience, transformation, current habit, access, format, sustainable cadence, willingness to pay and a pilot edition.'
  },
  ecommerce: {
    es: 'ECOMMERCE: pregunta por producto inicial, proveedor, coste puesto en destino, margen, devoluciones, diferenciación, canal y una preventa o lote pequeño.',
    en: 'ECOMMERCE: ask about initial product, supplier, landed cost, margin, returns, differentiation, channel and a preorder or small batch.'
  },
  generic: {
    es: 'GENERAL: pregunta por oferta inicial, primer cliente, disparador de compra, entrega, economía, acceso al mercado y microprueba.',
    en: 'GENERAL: ask about initial offer, first customer, buying trigger, delivery, economics, market access and a micro-test.'
  }
};

function maturityRule(maturity, locale) {
  const es = {
    idea: 'ETAPA IDEA: no existe historial. Nunca pidas ventas, clientes, conversión, retención ni facturación. Ayuda a concretar decisiones y una primera prueba barata.',
    preparing: 'ETAPA PREPARACIÓN: ya hay decisiones preliminares, pero no demanda validada. Pide supuestos concretos, recursos accesibles y estimaciones; no exijas métricas operativas.',
    testing: 'ETAPA PRUEBAS: pregunta por experimentos y reacciones observables sin asumir estabilidad.',
    operating: 'ETAPA EN MARCHA: puedes pedir métricas recientes cuando sean relevantes, priorizando margen, repetición y cuellos de botella.'
  };
  const en = {
    idea: 'IDEA STAGE: there is no history. Never request sales, customers, conversion, retention or revenue. Help define choices and a cheap first test.',
    preparing: 'PREPARATION STAGE: preliminary choices exist but demand is unvalidated. Request explicit assumptions, accessible resources and estimates; do not demand operating metrics.',
    testing: 'TESTING STAGE: ask about experiments and observable reactions without assuming stability.',
    operating: 'OPERATING STAGE: recent metrics are appropriate when relevant, prioritizing margin, repeat behavior and bottlenecks.'
  };
  return (locale === 'en' ? en : es)[maturity];
}

function modeRule(mode, locale) {
  if (locale === 'en') return mode === 'orientation'
    ? 'MODE: ORIENTATION. Behave like a practical co-founder: help the user make the next decisions, offer answerable choices, and turn uncertainty into a small action. Do not grade missing history as failure.'
    : 'MODE: VALIDATION. Behave like a rigorous discovery analyst: challenge evidence, compare claims, detect contradictions and demand measurable next steps.';
  return mode === 'orientation'
    ? 'MODO: ORIENTACIÓN. Actúa como un cofundador práctico: ayuda a tomar las siguientes decisiones, plantea opciones respondibles y convierte incertidumbre en una acción pequeña. No castigues la falta de historial.'
    : 'MODO: VALIDACIÓN. Actúa como analista riguroso: cuestiona evidencia, compara afirmaciones, detecta contradicciones y exige siguientes pasos medibles.';
}

function questionContract(locale, maturity, profile, mode) {
  return `${languageRule(locale)}\n${maturityRule(maturity, locale)}\n${modeRule(mode, locale)}\n${PROFILE_GUIDANCE[profile][locale]}\n${locale === 'en' ? `
Generate exactly 7 concise, non-overlapping questions. Each must be answerable at the user's stage and useful for starting or validating this specific business.
Use progressive order: define the first offer; identify the first reachable buyer; clarify the buying trigger; choose supply/delivery; estimate basic economics; choose acquisition; define a seven-day test.
Never ask for information already supplied. Never invent business history. In orientation mode, when the user does not know an answer, frame the question around a choice or estimate they can make now.
Return JSON only: {"questions":[{"question":"...","reason":"...","dimension":"offer|customer|trigger|supply|economics|distribution|validation"}],"maturity":"${maturity}","profile":"${profile}","analysisMode":"${mode}"}.` : `
Genera exactamente 7 preguntas breves y no solapadas. Cada una debe poder responderse en la etapa del usuario y servir para empezar o validar este negocio concreto.
Orden progresivo: definir la primera oferta; identificar al primer comprador accesible; aclarar el disparador de compra; elegir suministro/entrega; estimar economía básica; escoger captación; definir una prueba de siete días.
No repitas información aportada ni inventes historial. En modo orientación, cuando el usuario aún no sepa algo, formula la pregunta como una elección o estimación que pueda realizar ahora.
Devuelve solo JSON: {"questions":[{"question":"...","reason":"...","dimension":"offer|customer|trigger|supply|economics|distribution|validation"}],"maturity":"${maturity}","profile":"${profile}","analysisMode":"${mode}"}.`}`;
}

function reportContract(locale, maturity, profile, mode) {
  return `${languageRule(locale)}\n${maturityRule(maturity, locale)}\n${modeRule(mode, locale)}\n${PROFILE_GUIDANCE[profile][locale]}\n${locale === 'en' ? `
Create a decision report calibrated to maturity, profile and mode. Score five dimensions from 0 to 20: offerClarity, customerProblemFit, economicPlausibility, distributionFeasibility and validationReadiness. Total must equal their sum.
For early ideas, explicit and testable assumptions may earn partial points; absence of past sales is not a failure. Scores above 75 require real repeated or paid evidence.
Distinguish: what is promising, what is unknown, what contradicts, what must not be built yet, and the most useful next actions.
Create exactly seven profile-specific daily tasks that can be executed cheaply without building the full product. Every task needs an action and deliverable. End with a numerical continue/reframe/stop decision.
Return JSON only with score, scoreBreakdown, verdict, executiveSummary, strengths, risks, criticalAssumptions, contradictions, doNotBuildYet, recommendations, experiment{name,hypothesis,target,metric,successThreshold,failureThreshold,decisionIfSuccess,decisionIfFailure,days[7],steps}, maturity, profile, analysisMode.` : `
Crea un informe de decisión calibrado según madurez, perfil y modo. Puntúa de 0 a 20: offerClarity, customerProblemFit, economicPlausibility, distributionFeasibility y validationReadiness. El total debe ser su suma.
En ideas tempranas, los supuestos explícitos y comprobables pueden obtener puntuación parcial; no tener ventas previas no es un fallo. Una puntuación superior a 75 exige evidencia real repetida o de pago.
Distingue qué promete, qué se desconoce, qué se contradice, qué no debe construirse todavía y cuáles son las acciones siguientes más útiles.
Crea exactamente siete tareas diarias específicas para el perfil, baratas y sin construir el producto completo. Cada tarea debe tener acción y entregable. Termina con una decisión numérica de continuar, reformular o parar.
Devuelve solo JSON con score, scoreBreakdown, verdict, executiveSummary, strengths, risks, criticalAssumptions, contradictions, doNotBuildYet, recommendations, experiment{name,hypothesis,target,metric,successThreshold,failureThreshold,decisionIfSuccess,decisionIfFailure,days[7],steps}, maturity, profile, analysisMode.`}`;
}

const QUESTION_SETS = {
  resale: {
    es: [['¿Qué nicho concreto de artículos vas a probar primero y qué tres criterios usarás para seleccionarlos?','Acotar inventario mejora comparabilidad.','offer'],['¿Quién es el comprador más probable de ese nicho y qué valora al elegir una publicación?','Define un comprador observable.','customer'],['¿En qué rango de precio y estado se venden artículos comparables?','Usa el mercado visible como referencia.','trigger'],['¿Dónde conseguirás un lote inicial de 5 a 10 unidades sin arriesgar demasiado capital?','Valida acceso al inventario.','supply'],['¿Cuál es el coste máximo por unidad para conservar margen tras comisiones, envío y devoluciones?','Comprueba economía básica.','economics'],['¿Cuántos anuncios de calidad puedes preparar y publicar en una semana?','Aterriza capacidad y distribución.','distribution'],['¿Qué resultado del primer lote te hará comprar otro, cambiar de nicho o parar?','Define una decisión falsable.','validation']],
    en: [['Which exact item niche will you test first, and what three selection criteria will you use?','Narrow inventory improves comparability.','offer'],['Who is the most likely buyer for that niche, and what do they value in a listing?','Define an observable buyer.','customer'],['At what price and condition range do comparable items sell?','Use visible market behavior as a reference.','trigger'],['Where can you source an initial batch of 5 to 10 units without risking much capital?','Validate inventory access.','supply'],['What is the maximum unit cost that preserves margin after fees, shipping and returns?','Check basic economics.','economics'],['How many quality listings can you prepare and publish in one week?','Ground capacity and distribution.','distribution'],['What first-batch result makes you buy again, change niche or stop?','Define a falsifiable decision.','validation']]
  },
  generic: {
    es: [['¿Cuál es la primera versión concreta de la oferta que puedes explicar en una frase?','Evita una propuesta demasiado amplia.','offer'],['¿Quién es el primer cliente accesible y qué rasgo permite localizarlo?','Define un segmento alcanzable.','customer'],['¿Qué situación concreta activa la necesidad de comprar?','Aclara el momento de decisión.','trigger'],['¿Cómo entregarás las primeras diez ventas sin construir una infraestructura completa?','Diseña una entrega mínima.','supply'],['¿Qué costes y precio estimados harían viable una primera venta?','Explicita la economía básica.','economics'],['¿Qué canal permite mostrar la oferta a veinte personas adecuadas?','Comprueba acceso al mercado.','distribution'],['¿Qué microprueba puedes ejecutar esta semana y qué umbral decidirá el siguiente paso?','Convierte incertidumbre en aprendizaje.','validation']],
    en: [['What is the first concrete version of the offer you can explain in one sentence?','Avoid an overly broad proposition.','offer'],['Who is the first reachable customer, and what trait makes them findable?','Define an accessible segment.','customer'],['What concrete situation triggers the need to buy?','Clarify the buying moment.','trigger'],['How will you deliver the first ten sales without building full infrastructure?','Design minimum delivery.','supply'],['Which estimated costs and price would make a first sale viable?','Make basic economics explicit.','economics'],['Which channel can expose the offer to twenty suitable people?','Check market access.','distribution'],['What micro-test can you run this week, and what threshold determines the next step?','Turn uncertainty into learning.','validation']]
  }
};

function fallbackQuestions(locale, maturity, profile) {
  const source = QUESTION_SETS[profile] || QUESTION_SETS.generic;
  return source[locale].map(([question, reason, dimension]) => ({ question, reason, dimension, maturity, profile }));
}

function normalizeQuestions(data, locale, maturity, profile, mode) {
  const output = [];
  const seen = new Set();
  for (const item of array(data?.questions)) {
    const question = clean(item?.question || item?.text);
    if (!question || ((maturity === 'idea' || maturity === 'preparing') && HISTORICAL_QUESTION.test(question))) continue;
    const key = normalize(question);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ question, reason: clean(item?.reason || item?.dimension), dimension: clean(item?.dimension), maturity, profile, analysisMode: mode });
  }
  for (const item of fallbackQuestions(locale, maturity, profile)) {
    if (output.length >= 7) break;
    if (!seen.has(normalize(item.question))) output.push({ ...item, analysisMode: mode });
  }
  return { questions: output.slice(0, 7), maturity, profile, analysisMode: mode };
}

function numericBreakdown(report) {
  const raw = report?.scoreBreakdown || report?.scoring || {};
  const aliases = [['offerClarity','problemEvidence'],['customerProblemFit','customerSpecificity'],['economicPlausibility','paymentEvidence'],['distributionFeasibility','distributionFeasibility'],['validationReadiness','deliveryEconomics']];
  const values = {};
  for (const [key, legacy] of aliases) values[key] = Math.max(0, Math.min(20, Number(raw[key] ?? raw[legacy]) || 0));
  return { values, total: Math.round(Object.values(values).reduce((sum, value) => sum + value, 0)) };
}
function verdictFor(score, locale) {
  if (locale === 'en') return score < 35 ? 'DISCARD' : score < 55 ? 'REFRAME AND TEST' : score < 75 ? 'VALIDATE BEFORE BUILDING' : 'PROCEED WITH CAUTION';
  return score < 35 ? 'DESCARTAR' : score < 55 ? 'REFORMULAR Y PROBAR' : score < 75 ? 'VALIDAR ANTES DE CONSTRUIR' : 'AVANZAR CON CAUTELA';
}

function fallbackDays(locale, profile) {
  const resaleEs = [['Define el nicho y tres criterios de compra.','Ficha de selección.'],['Registra diez anuncios comparables con precio y estado.','Tabla de comparables.'],['Calcula el margen de tres unidades ejemplo.','Hoja de margen.'],['Consigue un lote máximo de cinco unidades dentro de un presupuesto cerrado.','Inventario inicial documentado.'],['Fotografía, describe y publica el lote con un estándar común.','Cinco anuncios publicados.'],['Registra visitas, favoritos, preguntas y ofertas durante 48 horas.','Registro de señales.'],['Compara el resultado con los umbrales y decide comprar, cambiar nicho o parar.','Decisión escrita con cifras.']];
  const genericEs = [['Define una hipótesis falsable sobre el supuesto principal.','Hipótesis en una frase.'],['Selecciona veinte personas que encajen con el cliente inicial.','Lista de prospectos.'],['Crea una oferta manual de una página con precio.','Oferta lista para mostrar.'],['Muestra la oferta a diez personas y registra respuestas.','Diez contactos registrados.'],['Habla con cinco personas sobre su conducta actual.','Cinco conversaciones documentadas.'],['Solicita una acción real: reserva, pago, cita o compromiso.','Decisiones reales registradas.'],['Compara resultados con los umbrales y decide continuar, reformular o parar.','Decisión escrita con cifras.']];
  const es = profile === 'resale' ? resaleEs : genericEs;
  if (locale === 'en') {
    const resaleEn = [['Define the niche and three buying criteria.','Selection brief.'],['Record ten comparable listings with price and condition.','Comparable-listing table.'],['Calculate margin for three example units.','Unit-margin sheet.'],['Source a maximum five-unit batch within a fixed budget.','Documented initial inventory.'],['Photograph, describe and publish the batch consistently.','Five live listings.'],['Track views, saves, questions and offers for 48 hours.','Signal log.'],['Compare results with thresholds and decide to restock, change niche or stop.','Written decision with counts.']];
    const genericEn = [['Define a falsifiable hypothesis for the main assumption.','One-sentence hypothesis.'],['Select twenty people matching the initial customer.','Prospect list.'],['Create a one-page manual offer with a price.','Offer ready to show.'],['Show the offer to ten people and log responses.','Ten recorded contacts.'],['Speak with five people about current behavior.','Five documented conversations.'],['Request a real action: booking, payment, meeting or commitment.','Recorded real decisions.'],['Compare results with thresholds and decide to continue, reframe or stop.','Written decision with counts.']];
    return (profile === 'resale' ? resaleEn : genericEn).map(([action, deliverable], index) => ({ day: index + 1, action, deliverable }));
  }
  return es.map(([action, deliverable], index) => ({ day: index + 1, action, deliverable }));
}

function normalizeDays(experiment, locale, profile) {
  const days = array(experiment?.days).map((item, index) => ({ day: Number(item?.day) || index + 1, action: clean(item?.action || item?.task || item), deliverable: clean(item?.deliverable || item?.output) })).filter(item => item.action);
  const fallback = fallbackDays(locale, profile);
  for (let i = days.length; i < 7; i += 1) days.push(fallback[i]);
  return days.slice(0, 7).map((item, index) => ({ ...item, day: index + 1, deliverable: item.deliverable || fallback[index].deliverable }));
}

function normalizeReport(data, locale, maturity, profile, mode) {
  const breakdown = numericBreakdown(data);
  const hasBreakdown = Object.values(breakdown.values).some(value => value > 0);
  const rawScore = Number(data?.score);
  const score = hasBreakdown ? breakdown.total : Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;
  const experiment = data?.experiment || data?.validationExperiment || {};
  const days = normalizeDays(experiment, locale, profile);
  const steps = days.map(item => locale === 'en' ? `Day ${item.day}: ${item.action} Deliverable: ${item.deliverable}` : `Día ${item.day}: ${item.action} Entregable: ${item.deliverable}`);
  return {
    ...data, score, scoreBreakdown: breakdown.values, verdict: verdictFor(score, locale), maturity, profile, analysisMode: mode,
    executiveSummary: clean(data?.executiveSummary || data?.summary) || (locale === 'en' ? 'Atlas has identified the decisions and evidence needed before investing further.' : 'Atlas ha identificado las decisiones y la evidencia necesarias antes de invertir más.'),
    strengths: array(data?.strengths), risks: array(data?.risks), criticalAssumptions: array(data?.criticalAssumptions || data?.assumptions), contradictions: array(data?.contradictions), doNotBuildYet: array(data?.doNotBuildYet), recommendations: array(data?.recommendations),
    experiment: { ...experiment, name: clean(experiment?.name) || (locale === 'en' ? '7-day evidence test' : 'Prueba de evidencia de 7 días'), hypothesis: clean(experiment?.hypothesis), target: clean(experiment?.target), metric: clean(experiment?.metric), successThreshold: clean(experiment?.successThreshold), failureThreshold: clean(experiment?.failureThreshold), decisionIfSuccess: clean(experiment?.decisionIfSuccess), decisionIfFailure: clean(experiment?.decisionIfFailure), days, steps }
  };
}

async function callUpstream(body) {
  const response = await fetch(UPSTREAM, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('invalid_upstream_json'); }
  return { status: response.status, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = { ...req.body };
    const locale = localeOf(body);
    if (isProhibited(body)) return res.status(200).json(blocked(locale));
    if (!body.mode && body.stage) body.mode = MODE_BY_STAGE[body.stage];
    delete body.stage;
    if (!body.mode) return res.status(400).json({ error: locale === 'en' ? 'Invalid mode' : 'Modo inválido' });

    const maturity = inferMaturity(body);
    const profile = inferProfile(body);
    const analysisMode = inferMode(body, maturity);
    const contract = body.mode === 'questions' ? questionContract(locale, maturity, profile, analysisMode) : reportContract(locale, maturity, profile, analysisMode);
    body.language = locale;
    body.locale = locale;
    body.outputLanguage = locale === 'en' ? 'English' : 'Spanish';
    body.atlasVersion = '3.3-calibrated';
    body.maturity = maturity;
    body.businessProfile = profile;
    body.analysisMode = analysisMode;
    body.idea = `${clean(body.idea)}\n\n${contract}`;

    const upstream = await callUpstream(body);
    if (upstream.status >= 400) return res.status(upstream.status).json(upstream.data);
    const result = body.mode === 'questions'
      ? normalizeQuestions(upstream.data, locale, maturity, profile, analysisMode)
      : normalizeReport(upstream.data, locale, maturity, profile, analysisMode);
    return res.status(200).json(result);
  } catch (error) {
    const english = localeOf(req.body || {}) === 'en';
    return res.status(502).json({ error: error?.message === 'invalid_upstream_json' ? (english ? 'Invalid response from analysis engine' : 'Respuesta inválida del motor de análisis') : (english ? 'Atlas could not complete the analysis. Please try again.' : 'Atlas no pudo completar el análisis. Inténtalo de nuevo.') });
  }
}
