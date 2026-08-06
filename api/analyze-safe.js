import analyzeHandler from './analyze.js';

const UPSTREAM = 'https://atlas-validator.vercel.app/api/analyze';
const clean = value => String(value || '').trim();
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const array = value => Array.isArray(value) ? value.filter(Boolean) : [];
const localeOf = body => body?.locale === 'en' || body?.language === 'en' || body?.language === 'English' ? 'en' : 'es';

const DEFENSIVE = /\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|antifraude|educacion|investigacion|periodismo|auditoria|cumplimiento|mitigar|rehabilitacion|desradicalizacion|victima|prevent|protect|detect|defend|security|cybersecurity|anti.?fraud|education|research|journalism|audit|compliance|mitigate|rehabilitation|deradicali[sz]ation|victim)\b/i;
const LAWFUL_DISTANCE = /\b(historia|historico|historica|documental|novela|ficcion|analisis academico|estudio academico|museo|memoria historica|history|historical|documentary|novel|fiction|academic analysis|academic study|museum)\b/i;

const HARM_DOMAINS = {
  violent_extremism: /\b(eta|isis|daesh|al.?qaeda|hamas|hezbollah|terroris|yihad|jihad|extremis|insurgenc|guerrill|milicia|militia|reactivacion armada|reactivacion violenta|lucha armada|armed revival|armed struggle|violent uprising|atentado|bomba|explosiv|secuestro|asesin|matar|ejecutar a|sabotaje violento)\b/i,
  cybercrime: /\b(phishing|carding|ransomware|malware|sim.?swap|robo de credenciales|credential theft|credential harvesting|hackear|intrusion no autorizada|botnet|keylogger|stealer|doxx|bypass de seguridad)\b/i,
  fraud: /\b(estafa|fraude|suplantacion|identity theft|robo de identidad|blanqueo|lavado de dinero|money laundering|falsificar|documentos falsos|counterfeit|fake documents|esquema ponzi|ponzi|piramidal)\b/i,
  exploitation: /\b(trafico de personas|human trafficking|explotacion sexual|sexual exploitation|trabajo forzado|forced labor|secuestro|kidnap|extorsion|extortion)\b/i,
  weapons_drugs: /\b(arma ilegal|armas ilegales|weapon trafficking|trafico de armas|explosivo|bomba casera|veneno|cocaina|heroina|metanfetamina|fentanilo|drug trafficking|trafico de drogas)\b/i,
  privacy_abuse: /\b(acechar|stalk|espiar a|spy on|doxx|invadir privacidad|trackear sin permiso|seguimiento clandestino)\b/i
};

const INTENT = {
  create: /\b(crear|montar|fundar|reactivar|resucitar|relanzar|organizar|construir|desarrollar|poner en marcha|start|build|create|found|revive|reactivate|relaunch|organize|develop|set up)\b/i,
  recruit: /\b(reclutar|captar miembros|sumar gente|unirse|afiliar|militantes|voluntarios|perfiles dispuestos|recruit|members|join|affiliates|supporters)\b/i,
  finance: /\b(financiar|fondos|donantes|inversores|recaudar|monetizar|presupuesto|funding|finance|donors|investors|raise money|monetize|budget)\b/i,
  acquire: /\b(conseguir|comprar|obtener|proveedor|abastecer|materiales|recursos|herramientas|source|buy|obtain|supplier|materials|resources|tools)\b/i,
  optimize: /\b(optimizar|escalar|mejorar eficacia|aumentar impacto|hacer mas efectivo|automatizar|optimize|scale|increase impact|more effective|automate)\b/i,
  evade: /\b(evitar deteccion|evadir|ocultar|anonim|sin dejar rastro|burlar|esquivar controles|avoid detection|evade|hide|anonymous|leave no trace|bypass controls)\b/i,
  target: /\b(objetivo|victima|seleccionar perfiles|a quien atacar|quien seria vulnerable|target|victim|who to attack|vulnerable people)\b/i,
  execute: /\b(paso a paso|como hacerlo|como llevarlo a cabo|plan de accion|hoja de ruta|operacion|logistica|ejecutar|step by step|how to do it|action plan|roadmap|operation|logistics|execute)\b/i
};

const ORGANIZATION = /\b(grupo|organizacion|celula|red|estructura|movimiento|comando|equipo|comunidad cerrada|group|organization|cell|network|structure|movement|command|team|closed community)\b/i;
const BENEFIT = /\b(ganar dinero|rentable|negocio|servicio|vender|cobrar|beneficio|profit|business|service|sell|charge|revenue)\b/i;
const EUPHEMISM = /\b(reactivacion|resistencia|causa|movimiento|operacion especial|accion directa|defensa activa|justicia por mano propia|servicio discreto|solucion no convencional|comunidad de accion|revival|resistance|cause|special operation|direct action|active defense|vigilante justice|discreet service|unconventional solution|action community)\b/i;
const OUTPUT_DANGER = /\b(recluta|financia|consigue armas|consigue explosivos|selecciona objetivos|evita deteccion|oculta tu identidad|crea una celula|capta miembros|recruit|fundraise|obtain weapons|obtain explosives|select targets|avoid detection|hide your identity|create a cell)\b/i;

function requestText(body) {
  const answers = array(body?.answers).map(item => `${item?.question || ''} ${item?.answer || ''}`).join(' ');
  return normalize(`${body?.idea || ''} ${answers}`);
}

function matchedKeys(patterns, text) {
  return Object.entries(patterns).filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
}

function localAssessment(body) {
  const text = requestText(body);
  const domains = matchedKeys(HARM_DOMAINS, text);
  const intents = matchedKeys(INTENT, text);
  const defensive = DEFENSIVE.test(text);
  const lawfulDistance = LAWFUL_DISTANCE.test(text);
  const organization = ORGANIZATION.test(text);
  const commercial = BENEFIT.test(text);
  const euphemism = EUPHEMISM.test(text);

  let score = 0;
  score += domains.length ? 5 : 0;
  score += Math.min(5, intents.length * 2);
  score += organization ? 2 : 0;
  score += commercial ? 2 : 0;
  score += euphemism && intents.length ? 2 : 0;
  score -= defensive ? 4 : 0;
  score -= lawfulDistance && !intents.length ? 3 : 0;

  const violentOperational = domains.includes('violent_extremism') && (
    intents.some(key => ['create','recruit','finance','acquire','optimize','evade','target','execute'].includes(key)) || organization || commercial
  );
  const operationalHarm = domains.length > 0 && intents.length > 0;
  const disguisedOperational = euphemism && intents.length >= 2 && (organization || commercial);
  const clearDefensive = defensive && !INTENT.create.test(text) && !INTENT.recruit.test(text) && !INTENT.finance.test(text) && !INTENT.execute.test(text);

  let classification = 'allowed';
  if (!clearDefensive && (violentOperational || score >= 8 || operationalHarm || disguisedOperational)) classification = 'prohibited';
  else if (domains.length || score >= 4) classification = 'sensitive';

  return { classification, score, domains, intents, defensive, lawfulDistance, organization, commercial, euphemism, text };
}

function blocked(locale, reason, category = 'harmful_or_illegal') {
  return locale === 'en'
    ? { status: 'blocked', classification: 'prohibited', category, reason: reason || 'Atlas cannot help plan, organize, fund, recruit for, optimize or conceal illegal or seriously harmful activity. It can help with prevention, compliance, victim support or lawful alternatives.' }
    : { status: 'blocked', classification: 'prohibited', category, reason: reason || 'Atlas no puede ayudar a planificar, organizar, financiar, reclutar, optimizar u ocultar actividades ilegales o gravemente dañinas. Sí puede ayudar con prevención, cumplimiento, apoyo a víctimas o alternativas legales.' };
}

function classifierPrompt(text, locale, phase) {
  const language = locale === 'en' ? 'English' : 'Spanish';
  return `You are Atlas Security Gate, an independent risk decision system. Reply in JSON only and never generate business questions.\nLanguage: ${language}. Phase: ${phase}.\nEvaluate MEANING and INTENT, including euphemisms and indirect wording.\nDecide using these axes: subject domain; user goal; requested actions; who benefits; operational detail; recruitment/funding/sourcing/targeting/evasion; legitimate defensive or documentary context.\nPROHIBITED when the content would help create, revive, organize, recruit for, finance, equip, target for, conceal, monetize or improve illegal or seriously harmful conduct. This includes violent extremist organizations and armed groups even when described as a cause, resistance, movement, revival or community.\nSENSITIVE only when regulated or ambiguous without operational enablement.\nALLOWED for clearly defensive prevention, compliance, victim assistance, historical description, journalism or academic analysis that does not provide operational enablement.\nIf high-consequence violence or extremism is paired with organization, recruitment, funding, logistics, targets, evasion or execution, choose PROHIBITED regardless of claimed business framing.\nFor output review, choose PROHIBITED when any question or plan asks who will join, fund, supply, target, conceal or operationalize harmful conduct.\nReturn exactly: {"classification":"allowed|sensitive|prohibited","category":"...","confidence":0.0,"reason":"...","signals":["..."]}.\nCONTENT:\n${text}`;
}

async function callClassifier(text, locale, phase) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ mode: 'report', stage: 'report', idea: classifierPrompt(text, locale, phase), answers: [], language: locale, locale, safetyClassificationOnly: true })
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { return { classification: 'unknown', confidence: 0, reason: 'invalid_classifier_response' }; }
    if (data?.status === 'blocked' || normalize(data?.classification) === 'prohibited') return { classification: 'prohibited', category: clean(data?.category), confidence: Number(data?.confidence) || 1, reason: clean(data?.reason) };
    const candidate = data?.safety || data?.classificationResult || data;
    const label = normalize(candidate?.classification || candidate?.label || candidate?.status);
    if (['allowed','sensitive','prohibited'].includes(label)) return { classification: label, category: clean(candidate?.category), confidence: Number(candidate?.confidence) || 0.7, reason: clean(candidate?.reason) };
    const serialized = normalize(raw);
    if (/\bprohibited\b/.test(serialized)) return { classification: 'prohibited', confidence: 0.65, reason: 'semantic_classifier_block' };
    if (/\bsensitive\b/.test(serialized)) return { classification: 'sensitive', confidence: 0.55, reason: 'semantic_classifier_sensitive' };
    if (/\ballowed\b/.test(serialized)) return { classification: 'allowed', confidence: 0.55, reason: 'semantic_classifier_allow' };
    return { classification: 'unknown', confidence: 0, reason: 'classifier_contract_not_met' };
  } catch {
    return { classification: 'unknown', confidence: 0, reason: 'classifier_unavailable' };
  } finally { clearTimeout(timeout); }
}

function invokeAnalyze(req) {
  return new Promise((resolve, reject) => {
    let statusCode = 200;
    const fakeRes = {
      status(code) { statusCode = code; return this; },
      json(data) { resolve({ statusCode, data }); return this; },
      send(data) { resolve({ statusCode, data }); return this; },
      setHeader() { return this; },
      end(data) { resolve({ statusCode, data }); return this; }
    };
    Promise.resolve(analyzeHandler(req, fakeRes)).catch(reject);
  });
}

function outputText(data) { try { return JSON.stringify(data); } catch { return String(data || ''); } }

function dangerousOutput(data) {
  const text = normalize(outputText(data));
  const assessment = localAssessment({ idea: text });
  const direct = OUTPUT_DANGER.test(text);
  return { ...assessment, direct, prohibited: direct || assessment.classification === 'prohibited' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = { ...(req.body || {}) };
  const locale = localeOf(body);
  const local = localAssessment(body);

  // Hard gate: deterministic reasoning blocks high-consequence operational harm before any model call.
  if (local.classification === 'prohibited') {
    return res.status(200).json(blocked(locale, '', local.domains[0] || 'harmful_or_illegal'));
  }

  const semantic = await callClassifier(local.text, locale, 'INPUT');
  if (semantic.classification === 'prohibited') return res.status(200).json(blocked(locale, semantic.reason, semantic.category));

  // Fail closed for any unresolved sensitive/high-risk input.
  if ((semantic.classification === 'unknown' && local.classification === 'sensitive') || (semantic.classification === 'sensitive' && local.score >= 5)) {
    return res.status(200).json(blocked(locale, locale === 'en' ? 'Atlas could not verify that this sensitive request is safe to operationalize.' : 'Atlas no pudo verificar que esta solicitud sensible sea segura para convertirla en un plan.', local.domains[0] || 'unverified_sensitive'));
  }

  try {
    const result = await invokeAnalyze({ ...req, body });
    if (result.statusCode >= 400) return res.status(result.statusCode).json(result.data);
    if (result.data?.status === 'blocked' || result.data?.classification === 'prohibited') return res.status(200).json(result.data);

    const localOutput = dangerousOutput(result.data);
    if (localOutput.prohibited) return res.status(200).json(blocked(locale, locale === 'en' ? 'Atlas stopped generated content that could enable harm.' : 'Atlas detuvo contenido generado que podía facilitar una actividad dañina.', localOutput.domains[0] || 'unsafe_output'));

    const outputReview = await callClassifier(outputText(result.data), locale, body.stage === 'report' || body.mode === 'report' ? 'REPORT_OUTPUT' : 'QUESTION_OUTPUT');
    if (outputReview.classification === 'prohibited') return res.status(200).json(blocked(locale, locale === 'en' ? 'Atlas stopped generated content that could materially facilitate harm.' : 'Atlas detuvo contenido generado que podía facilitar materialmente una actividad dañina.', outputReview.category));
    if (outputReview.classification === 'unknown' && local.classification !== 'allowed') return res.status(200).json(blocked(locale, locale === 'en' ? 'Atlas could not safely verify the generated content.' : 'Atlas no pudo verificar de forma segura el contenido generado.', 'unverified_output'));

    return res.status(result.statusCode).json({ ...result.data, safety: { classification: local.classification === 'sensitive' || semantic.classification === 'sensitive' || outputReview.classification === 'sensitive' ? 'sensitive' : 'allowed', reviewed: true, gateVersion: 'security-gate-2' } });
  } catch {
    return res.status(502).json({ error: locale === 'en' ? 'Atlas could not complete the safety-checked analysis. Please try again.' : 'Atlas no pudo completar el análisis con control de seguridad. Inténtalo de nuevo.' });
  }
}
