const UPSTREAM = 'https://atlas-validator.vercel.app/api/analyze';
const MODE_BY_STAGE = { screen: 'questions', report: 'report' };

const PROTECTIVE_CONTEXT = /\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|anti[- ]?fraude|educacion|auditoria|cumplimiento|mitigar|prevent|protect|detect|defend|security|cybersecurity|anti[- ]?fraud|education|audit|compliance|mitigate)\b/i;
const PROHIBITED_PATTERNS = [/\bsim\s*swap(?:ping)?\b/i,/\bphishing\s*(?:kit|service|as a service)?\b/i,/\brobo\s+de\s+credenciales\b/i,/\bcredential\s+(?:theft|stealing|harvesting)\b/i,/\bcarding\b/i,/\bransomware\s*(?:as a service|service)?\b/i,/\bmalware\s*(?:as a service|service)?\b/i,/\brobo\s+de\s+identidad\b/i,/\bidentity\s+theft\b/i];

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
  const operating = /\b(vendo|vendemos|clientes actuales|facturo|facturamos|ingresos mensuales|ventas mensuales|mrr|arr|churn|retencion|conversion actual|we sell|current customers|monthly revenue|monthly sales|retention|current conversion)\b/i;
  const testing = /\b(prototipo|landing|entrevist|preventa|piloto|lista de espera|primeros clientes|primeras ventas|mvp|prototype|interview|preorder|pilot|waitlist|first customers|first sales)\b/i;
  const preparing = /\b(proveedor|inventario|presupuesto|precio estimado|canal|perfil de cliente|supplier|inventory|budget|estimated price|channel|customer profile)\b/i;
  if (operating.test(text)) return 'operating';
  if (testing.test(text)) return 'testing';
  if (preparing.test(text)) return 'preparing';
  return 'idea';
}

function languageRule(locale) {
  return locale === 'en'
    ? 'OUTPUT LANGUAGE: ENGLISH ONLY. Never mix languages.'
    : 'IDIOMA DE SALIDA: SOLO ESPAÑOL. Nunca mezcles idiomas.';
}

function maturityRule(maturity, locale) {
  const rules = {
    idea: locale === 'en'
      ? 'MATURITY: IDEA ONLY. The person has not launched. Never ask for past sales, current customers, historical conversion, retention, revenue or metrics they cannot have. Ask about choices they can make now, accessible resources, reasonable estimates, comparable behavior and a first low-cost test.'
      : 'MADUREZ: SOLO IDEA. La persona aún no ha lanzado. Nunca preguntes por ventas pasadas, clientes actuales, conversión histórica, retención, facturación ni métricas que no puede tener. Pregunta por decisiones que puede tomar ahora, recursos accesibles, estimaciones razonables, conductas comparables y una primera prueba barata.',
    preparing: locale === 'en'
      ? 'MATURITY: PREPARING. The person is defining suppliers, offer or channel but has not validated demand. Ask about assumptions, accessible inventory/resources, estimated unit economics and the smallest real-market test. Do not demand operating history.'
      : 'MADUREZ: PREPARACIÓN. La persona está definiendo proveedores, oferta o canal, pero todavía no ha validado demanda. Pregunta por supuestos, inventario o recursos accesibles, economía unitaria estimada y la prueba mínima en mercado. No exijas historial operativo.',
    testing: locale === 'en'
      ? 'MATURITY: EARLY TESTING. Ask about the tests already attempted and observable reactions, but do not assume a stable business. Distinguish learning signals from repeatable traction.'
      : 'MADUREZ: PRIMERAS PRUEBAS. Pregunta por las pruebas realizadas y reacciones observables, pero no asumas que existe un negocio estable. Distingue señales de aprendizaje de tracción repetible.',
    operating: locale === 'en'
      ? 'MATURITY: OPERATING. Historical metrics are appropriate only when directly relevant. Prefer recent cohorts, margins, repeat behavior and bottlenecks over vanity metrics.'
      : 'MADUREZ: EN MARCHA. Las métricas históricas son apropiadas solo cuando sean relevantes. Prioriza cohortes recientes, márgenes, repetición y cuellos de botella frente a métricas vanidosas.'
  };
  return rules[maturity];
}

function questionContract(locale, maturity) {
  return `${languageRule(locale)}\n${maturityRule(maturity, locale)}\n${locale === 'en' ? `
ATLAS QUESTION CONTRACT
Generate exactly 7 concise questions tailored to the idea and its maturity.
The questions must help the person START or VALIDATE the business, not interrogate them as if it already exists.
Use progressive difficulty: clarify the offer, define the first buyer, understand the buying trigger, choose supply/delivery, estimate unit economics, choose acquisition, then define a seven-day test.
For an idea-stage resale business such as selling on Vinted, suitable questions include: product niche, source of initial inventory, maximum purchase cost, expected resale range, fees/shipping, listing capacity and a test batch. An unsuitable question is “How many items did you sell last month?” unless the user explicitly says they are already selling.
Never ask for information already present. Never invent business history. If evidence does not exist yet, ask how the user could obtain it.
Return JSON only: {"questions":[{"question":"...","reason":"...","dimension":"offer|customer|trigger|supply|economics|distribution|validation"}],"maturity":"${maturity}"}.` : `
CONTRATO DE PREGUNTAS ATLAS
Genera exactamente 7 preguntas breves adaptadas a la idea y a su madurez.
Las preguntas deben ayudar a EMPEZAR o VALIDAR el negocio, no interrogar a la persona como si ya estuviera funcionando.
Usa dificultad progresiva: aclarar la oferta, definir el primer comprador, comprender el momento de compra, elegir suministro/entrega, estimar economía unitaria, escoger adquisición y definir una prueba de siete días.
Para una idea inicial de reventa en Vinted, son adecuadas preguntas sobre nicho de prendas, fuente del primer inventario, coste máximo de compra, rango de reventa, comisiones/envío, capacidad de publicación y lote de prueba. Es inadecuado preguntar «¿cuántas prendas vendiste el mes pasado?» salvo que el usuario diga expresamente que ya vende.
No repitas información ya aportada. No inventes historial empresarial. Cuando aún no exista evidencia, pregunta cómo podría conseguirla.
Devuelve solo JSON: {"questions":[{"question":"...","reason":"...","dimension":"offer|customer|trigger|supply|economics|distribution|validation"}],"maturity":"${maturity}"}.`}`;
}

function reportContract(locale, maturity) {
  return `${languageRule(locale)}\n${maturityRule(maturity, locale)}\n${locale === 'en' ? `
ATLAS DECISION REPORT CONTRACT
Evaluate the quality of the opportunity and the next decision, not whether an unlaunched founder already has traction.
Calibrate evidence to maturity:
- IDEA: reasonable assumptions can earn partial points when explicit and testable; absence of historical sales is not a failure.
- PREPARING: reward concrete sourcing, pricing and channel assumptions.
- TESTING: reward observable responses, reservations, interviews and small transactions.
- OPERATING: require actual economics and repeat behavior.
Use five 0-20 dimensions: offer clarity, customer/problem fit, economic plausibility, access/distribution feasibility, validation readiness. Total equals their sum.
A high score still requires meaningful evidence, but an early idea can receive a constructive mid-range score when the path to evidence is clear.
Identify contradictions without punishing honest uncertainty. Recommendations must tell the user what to decide or do next.
Create exactly seven daily tasks appropriate to maturity. For idea-stage businesses, the plan should move from choices and estimates to a tiny market test; it must not assume existing customers.
Return JSON only with: score, scoreBreakdown, verdict, executiveSummary, strengths, risks, criticalAssumptions, contradictions, doNotBuildYet, recommendations, experiment{name,hypothesis,target,metric,successThreshold,failureThreshold,decisionIfSuccess,decisionIfFailure,days[7],steps}, maturity.` : `
CONTRATO DEL INFORME DE DECISIÓN ATLAS
Evalúa la calidad de la oportunidad y la siguiente decisión, no si un fundador sin lanzar ya tiene tracción.
Calibra la evidencia según madurez:
- IDEA: los supuestos razonables pueden obtener puntuación parcial cuando son explícitos y comprobables; no tener ventas históricas no es un fallo.
- PREPARACIÓN: valora supuestos concretos de suministro, precio y canal.
- PRUEBAS: valora reacciones observables, reservas, entrevistas y pequeñas transacciones.
- EN MARCHA: exige economía real y comportamiento repetido.
Usa cinco dimensiones de 0 a 20: claridad de oferta, encaje cliente/problema, plausibilidad económica, viabilidad de acceso/distribución y preparación para validar. El total es su suma.
Una puntuación alta sigue necesitando evidencia significativa, pero una idea temprana puede obtener una puntuación media constructiva cuando el camino hacia la evidencia está claro.
Detecta contradicciones sin castigar la incertidumbre honesta. Las recomendaciones deben decir qué decidir o hacer después.
Crea exactamente siete tareas diarias adecuadas a la madurez. En ideas iniciales, el plan debe avanzar desde decisiones y estimaciones hasta una microprueba de mercado; no debe asumir clientes existentes.
Devuelve solo JSON con: score, scoreBreakdown, verdict, executiveSummary, strengths, risks, criticalAssumptions, contradictions, doNotBuildYet, recommendations, experiment{name,hypothesis,target,metric,successThreshold,failureThreshold,decisionIfSuccess,decisionIfFailure,days[7],steps}, maturity.`}`;
}

function fallbackQuestions(locale, maturity) {
  const ideaEs = [
    ['¿Qué categoría concreta de producto o servicio vas a ofrecer primero y por qué empezar por esa?', 'Acotar la oferta evita probar demasiadas variables a la vez.', 'offer'],
    ['¿Quién sería el primer comprador específico y qué le haría elegirte frente a las alternativas?', 'Define una persona y un motivo de compra comprobable.', 'customer'],
    ['¿En qué situación concreta aparece la necesidad o el deseo de compra?', 'El momento de compra ayuda a diseñar oferta y mensaje.', 'trigger'],
    ['¿De dónde obtendrás el primer inventario o los recursos para entregar diez ventas sin asumir un gran riesgo?', 'Comprueba que puedes empezar en pequeño.', 'supply'],
    ['¿Cuál es tu coste máximo estimado por unidad y a qué precio realista podrías vender tras comisiones, envío y devoluciones?', 'Una estimación explícita permite detectar si el margen puede existir.', 'economics'],
    ['¿Qué canal usarás para mostrar la oferta a los primeros veinte compradores potenciales?', 'La distribución debe ser posible antes de escalar.', 'distribution'],
    ['¿Qué lote, anuncio u oferta mínima puedes publicar esta semana y qué resultado decidirá si continúas?', 'Convierte la idea en una prueba barata y falsable.', 'validation']
  ];
  const ideaEn = [
    ['What exact product or service category will you offer first, and why start there?', 'A narrow offer avoids testing too many variables at once.', 'offer'],
    ['Who is the first specific buyer, and why would they choose you over alternatives?', 'Define one reachable person and a testable buying reason.', 'customer'],
    ['In what concrete situation does the need or desire to buy appear?', 'The buying moment shapes the offer and message.', 'trigger'],
    ['Where will the first inventory or delivery resources come from for ten sales without taking a large risk?', 'Check that the idea can start small.', 'supply'],
    ['What is the maximum estimated unit cost and a realistic selling price after fees, shipping and returns?', 'Explicit estimates reveal whether a margin can exist.', 'economics'],
    ['Which channel will expose the offer to the first twenty potential buyers?', 'Distribution must be possible before scale.', 'distribution'],
    ['What minimum batch, listing or offer can you publish this week, and what result determines whether to continue?', 'Turn the idea into a cheap falsifiable test.', 'validation']
  ];
  const base = locale === 'en' ? ideaEn : ideaEs;
  return base.map(([question, reason, dimension]) => ({ question, reason, dimension, maturity }));
}

function normalizeQuestions(data, locale, maturity) {
  const output = [];
  const seen = new Set();
  for (const item of array(data?.questions)) {
    const question = clean(item?.question || item?.text);
    if (!question) continue;
    const key = normalize(question);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ question, reason: clean(item?.reason || item?.dimension), dimension: clean(item?.dimension), maturity });
  }
  for (const item of fallbackQuestions(locale, maturity)) {
    if (output.length >= 7) break;
    if (!seen.has(normalize(item.question))) output.push(item);
  }
  return { questions: output.slice(0, 7), maturity };
}

function numericBreakdown(report) {
  const raw = report?.scoreBreakdown || report?.scoring || {};
  const aliases = [
    ['offerClarity', 'problemEvidence'],
    ['customerProblemFit', 'customerSpecificity'],
    ['economicPlausibility', 'paymentEvidence'],
    ['distributionFeasibility', 'distributionFeasibility'],
    ['validationReadiness', 'deliveryEconomics']
  ];
  const values = {};
  for (const [key, legacy] of aliases) values[key] = Math.max(0, Math.min(20, Number(raw[key] ?? raw[legacy]) || 0));
  return { values, total: Math.round(Object.values(values).reduce((sum, value) => sum + value, 0)) };
}
function verdict(score, locale) {
  if (locale === 'en') return score < 35 ? 'DISCARD' : score < 55 ? 'REFRAME AND TEST' : score < 75 ? 'VALIDATE BEFORE BUILDING' : 'PROCEED WITH CAUTION';
  return score < 35 ? 'DESCARTAR' : score < 55 ? 'REFORMULAR Y PROBAR' : score < 75 ? 'VALIDAR ANTES DE CONSTRUIR' : 'AVANZAR CON CAUTELA';
}
function fallbackDays(locale, maturity) {
  const es = [
    ['Elige un único nicho inicial y define tres criterios de selección.', 'Ficha del nicho y criterios.'],
    ['Localiza diez referencias comparables y registra precio, estado y tiempo publicado.', 'Tabla con diez comparables.'],
    ['Calcula coste, comisiones, envío, devoluciones y margen de tres unidades ejemplo.', 'Cálculo de margen por unidad.'],
    ['Consigue o identifica un lote mínimo de tres a cinco unidades sin comprometer mucho capital.', 'Lista o fotografías del lote de prueba.'],
    ['Prepara fotografías, títulos, descripción, precio y condiciones de la oferta.', 'Anuncios listos para publicar.'],
    ['Publica o presenta la microoferta y registra visitas, favoritos, preguntas y ofertas.', 'Registro de señales reales.'],
    ['Compara los resultados con el umbral y decide continuar, cambiar nicho/precio o parar.', 'Decisión escrita con cifras.']
  ];
  const en = [
    ['Choose one initial niche and define three selection criteria.', 'Niche sheet and criteria.'],
    ['Find ten comparable listings and record price, condition and time listed.', 'Table with ten comparables.'],
    ['Calculate cost, fees, shipping, returns and margin for three example units.', 'Unit-margin calculation.'],
    ['Source or identify a minimum batch of three to five units without risking much capital.', 'Test-batch list or photos.'],
    ['Prepare photos, titles, description, price and offer terms.', 'Listings ready to publish.'],
    ['Publish or present the micro-offer and record views, saves, questions and offers.', 'Log of real signals.'],
    ['Compare results with the threshold and decide to continue, change niche/price or stop.', 'Written decision supported by counts.']
  ];
  return (locale === 'en' ? en : es).map(([action, deliverable], index) => ({ day: index + 1, action, deliverable, maturity }));
}
function normalizeDays(experiment, locale, maturity) {
  const days = array(experiment?.days).map((item, index) => ({
    day: Number(item?.day) || index + 1,
    action: clean(item?.action || item?.task || item),
    deliverable: clean(item?.deliverable || item?.output)
  })).filter(item => item.action);
  const fallback = fallbackDays(locale, maturity);
  while (days.length < 7) days.push(fallback[days.length]);
  return days.slice(0, 7).map((item, index) => ({ ...item, day: index + 1 }));
}
function normalizeReport(data, locale, maturity) {
  const breakdown = numericBreakdown(data);
  let score = breakdown.total || Math.max(0, Math.min(100, Math.round(Number(data?.score) || 0)));
  const experiment = data?.experiment || data?.validationExperiment || {};
  const days = normalizeDays(experiment, locale, maturity);
  return {
    ...data,
    maturity,
    score,
    scoreBreakdown: breakdown.values,
    verdict: verdict(score, locale),
    executiveSummary: clean(data?.executiveSummary || data?.summary) || (locale === 'en' ? 'The idea is early; the useful decision is which assumption to test first.' : 'La idea está en una fase temprana; la decisión útil es qué supuesto comprobar primero.'),
    strengths: array(data?.strengths),
    risks: array(data?.risks),
    criticalAssumptions: array(data?.criticalAssumptions || data?.assumptions),
    contradictions: array(data?.contradictions),
    doNotBuildYet: array(data?.doNotBuildYet),
    recommendations: array(data?.recommendations),
    experiment: {
      ...experiment,
      name: clean(experiment?.name) || (locale === 'en' ? 'Seven-day first-market test' : 'Primera prueba de mercado en siete días'),
      hypothesis: clean(experiment?.hypothesis),
      target: clean(experiment?.target),
      metric: clean(experiment?.metric),
      successThreshold: clean(experiment?.successThreshold),
      failureThreshold: clean(experiment?.failureThreshold),
      decisionIfSuccess: clean(experiment?.decisionIfSuccess),
      decisionIfFailure: clean(experiment?.decisionIfFailure),
      days,
      steps: days.map(item => locale === 'en' ? `Day ${item.day}: ${item.action} Deliverable: ${item.deliverable}` : `Día ${item.day}: ${item.action} Entregable: ${item.deliverable}`)
    }
  };
}

async function upstream(body) {
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
    const contract = body.mode === 'questions' ? questionContract(locale, maturity) : reportContract(locale, maturity);
    body.language = locale;
    body.locale = locale;
    body.outputLanguage = locale === 'en' ? 'English' : 'Spanish';
    body.atlasVersion = '3.3-stage-aware';
    body.maturity = maturity;
    body.idea = `${clean(body.idea)}\n\n${contract}`;

    const result = await upstream(body);
    if (result.status >= 400) return res.status(result.status).json(result.data);
    return res.status(200).json(body.mode === 'questions' ? normalizeQuestions(result.data, locale, maturity) : normalizeReport(result.data, locale, maturity));
  } catch (error) {
    const locale = localeOf(req.body || {});
    return res.status(502).json({ error: error?.message === 'invalid_upstream_json' ? (locale === 'en' ? 'Invalid response from analysis engine' : 'Respuesta inválida del motor de análisis') : (locale === 'en' ? 'Atlas could not complete the analysis. Please try again.' : 'Atlas no pudo completar el análisis. Inténtalo de nuevo.') });
  }
}
