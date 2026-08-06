import analyzeHandler from './analyze.js';

const UPSTREAM = 'https://atlas-validator.vercel.app/api/analyze';
const clean = value => String(value || '').trim();
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const array = value => Array.isArray(value) ? value.filter(Boolean) : [];
const localeOf = body => body?.locale === 'en' || body?.language === 'en' || body?.language === 'English' ? 'en' : 'es';

const DEFENSIVE_CONTEXT = /\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|antifraude|anti fraude|educacion|investigacion|periodismo|auditoria|cumplimiento|mitigar|rehabilitacion|prevent|protect|detect|defend|security|cybersecurity|anti fraud|education|research|journalism|audit|compliance|mitigate|rehabilitation)\b/i;
const HIGH_RISK_CONTEXT = /\b(estafa|fraude|phishing|carding|ransomware|malware|hackear|intrusion|credenciales|sim swap|suplantacion|robo de identidad|lavado|blanqueo|evas(?:ion|ión)|contrabando|trafico de personas|explotacion|secuestro|extorsion|terrorismo|yihad|atentado|asesinar|matar|veneno|explosivo|bomba|arma|drogas|cocaina|heroina|metanfetamina|falsificar|documentos falsos|acechar|espiar|doxx|fraud|scam|phishing|carding|ransomware|malware|hack|intrusion|credentials|sim swap|impersonation|identity theft|money laundering|evasion|smuggling|human trafficking|exploitation|kidnap|extortion|terrorism|jihad|attack|murder|kill|poison|explosive|bomb|weapon|drugs|cocaine|heroin|methamphetamine|counterfeit|fake documents|stalk|spy|doxx)\b/i;
const OPERATIONAL_LANGUAGE = /\b(como hacer|cómo hacer|paso a paso|guia|guía|instrucciones|conseguir|ejecutar|evitar deteccion|evitar detección|ocultar|anonim|comprar sin|fabricar|crear un servicio|montar un negocio|how to|step by step|instructions|execute|avoid detection|hide|anonymous|manufacture|build a service|start a business)\b/i;

function requestText(body) {
  const answers = array(body?.answers).map(item => `${item?.question || ''} ${item?.answer || ''}`).join(' ');
  return normalize(`${body?.idea || ''} ${answers}`);
}

function localRisk(body) {
  const text = requestText(body);
  const defensive = DEFENSIVE_CONTEXT.test(text);
  const highRisk = HIGH_RISK_CONTEXT.test(text);
  const operational = OPERATIONAL_LANGUAGE.test(text);
  return { text, defensive, highRisk, operational, block: highRisk && operational && !defensive };
}

function blocked(locale, reason, category = 'harmful_or_illegal') {
  return locale === 'en'
    ? { status: 'blocked', classification: 'prohibited', category, reason: reason || 'Atlas cannot analyze, optimize or provide an execution plan for illegal or harmful activity. It can only help with prevention, compliance or a lawful alternative.' }
    : { status: 'blocked', classification: 'prohibited', category, reason: reason || 'Atlas no puede analizar, optimizar ni proporcionar un plan de ejecución para una actividad ilegal o dañina. Solo puede ayudar con prevención, cumplimiento o una alternativa legal.' };
}

async function callClassifier(text, locale, phase) {
  const prompt = locale === 'en'
    ? `You are the mandatory Atlas safety classifier. Analyze the user's intent and meaning, not only keywords.\n\nClassify as ALLOWED, SENSITIVE or PROHIBITED.\nPROHIBITED means the request would facilitate, optimize, monetize or execute illegal or seriously harmful conduct, including cybercrime, fraud, evasion, trafficking, exploitation, violent wrongdoing, extremist operational support, weapons, illegal drugs, stalking, privacy invasion, counterfeit activity or concealment from authorities.\nALLOWED includes legitimate prevention, defensive security, compliance, education, journalism, research, victim support and clearly lawful businesses.\nSENSITIVE is legal but regulated, or genuinely ambiguous without operational harmful intent.\nFor output review, classify PROHIBITED if the generated material contains actionable steps, sourcing, evasion, targeting, operational optimization or a seven-day plan that could materially help wrongdoing.\nWhen uncertain and both high-risk subject matter and operational intent are present, choose PROHIBITED.\nReturn JSON only: {"classification":"allowed|sensitive|prohibited","category":"...","confidence":0-1,"reason":"short explanation"}.\nPHASE: ${phase}\nCONTENT:\n${text}`
    : `Eres el clasificador de seguridad obligatorio de Atlas. Analiza la intención y el significado, no solo palabras clave.\n\nClasifica como ALLOWED, SENSITIVE o PROHIBITED.\nPROHIBITED significa que la solicitud facilitaría, optimizaría, monetizaría o ejecutaría una conducta ilegal o gravemente dañina, incluyendo ciberdelito, fraude, evasión, tráfico, explotación, violencia operativa, apoyo extremista operativo, armas, drogas ilegales, acoso, invasión de privacidad, falsificación u ocultación frente a autoridades.\nALLOWED incluye prevención legítima, seguridad defensiva, cumplimiento, educación, periodismo, investigación, apoyo a víctimas y negocios claramente legales.\nSENSITIVE es legal pero regulado, o realmente ambiguo sin intención operativa dañina.\nEn la revisión de salida, clasifica PROHIBITED si el contenido generado incluye pasos accionables, abastecimiento, evasión, selección de objetivos, optimización operativa o un plan de siete días que pueda ayudar materialmente a cometer daños.\nCuando exista duda y coincidan un tema de alto riesgo y una intención operativa, elige PROHIBITED.\nDevuelve solo JSON: {"classification":"allowed|sensitive|prohibited","category":"...","confidence":0-1,"reason":"explicación breve"}.\nFASE: ${phase}\nCONTENIDO:\n${text}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        mode: 'questions',
        stage: 'screen',
        idea: prompt,
        language: locale,
        locale,
        outputLanguage: locale === 'en' ? 'English' : 'Spanish',
        safetyClassificationOnly: true
      })
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { return { classification: 'unknown', confidence: 0, reason: 'invalid_classifier_response' }; }

    if (data?.status === 'blocked' || normalize(data?.classification) === 'prohibited') {
      return { classification: 'prohibited', category: clean(data?.category), confidence: Number(data?.confidence) || 1, reason: clean(data?.reason) };
    }

    const candidate = data?.safety || data?.classificationResult || data;
    const label = normalize(candidate?.classification || candidate?.label || candidate?.status);
    if (['allowed', 'sensitive', 'prohibited'].includes(label)) {
      return { classification: label, category: clean(candidate?.category), confidence: Number(candidate?.confidence) || 0.7, reason: clean(candidate?.reason) };
    }

    const serialized = normalize(raw);
    if (/"classification"\s*:\s*"prohibited"|\bprohibited\b/.test(serialized)) return { classification: 'prohibited', confidence: 0.7, reason: 'semantic_classifier_block' };
    if (/"classification"\s*:\s*"sensitive"|\bsensitive\b/.test(serialized)) return { classification: 'sensitive', confidence: 0.6, reason: 'semantic_classifier_sensitive' };
    if (/"classification"\s*:\s*"allowed"|\ballowed\b/.test(serialized)) return { classification: 'allowed', confidence: 0.6, reason: 'semantic_classifier_allow' };
    return { classification: 'unknown', confidence: 0, reason: 'classifier_contract_not_met' };
  } catch {
    return { classification: 'unknown', confidence: 0, reason: 'classifier_unavailable' };
  } finally {
    clearTimeout(timeout);
  }
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

function outputText(data) {
  try { return JSON.stringify(data); } catch { return String(data || ''); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = { ...(req.body || {}) };
  const locale = localeOf(body);
  const risk = localRisk(body);

  if (risk.block) return res.status(200).json(blocked(locale));

  const inputReview = await callClassifier(requestText(body), locale, 'INPUT');
  if (inputReview.classification === 'prohibited') {
    return res.status(200).json(blocked(locale, inputReview.reason, inputReview.category));
  }

  if (inputReview.classification === 'unknown' && risk.highRisk && !risk.defensive) {
    return res.status(200).json(blocked(locale, locale === 'en' ? 'Atlas could not verify that this high-risk request is safe.' : 'Atlas no pudo verificar que esta solicitud de alto riesgo sea segura.', 'unverified_high_risk'));
  }

  try {
    const result = await invokeAnalyze({ ...req, body });
    if (result.statusCode >= 400) return res.status(result.statusCode).json(result.data);
    if (result.data?.status === 'blocked' || result.data?.classification === 'prohibited') return res.status(200).json(result.data);

    const review = await callClassifier(outputText(result.data), locale, body.stage === 'report' || body.mode === 'report' ? 'REPORT_OUTPUT' : 'QUESTION_OUTPUT');
    if (review.classification === 'prohibited') {
      return res.status(200).json(blocked(locale, locale === 'en' ? 'Atlas stopped the generated content because it could materially facilitate harm.' : 'Atlas detuvo el contenido generado porque podía facilitar materialmente una actividad dañina.', review.category));
    }

    if (review.classification === 'unknown' && risk.highRisk && !risk.defensive) {
      return res.status(200).json(blocked(locale, locale === 'en' ? 'Atlas could not safely verify the generated content.' : 'Atlas no pudo verificar de forma segura el contenido generado.', 'unverified_output'));
    }

    return res.status(result.statusCode).json({ ...result.data, safety: { classification: inputReview.classification === 'sensitive' || review.classification === 'sensitive' ? 'sensitive' : 'allowed', reviewed: true } });
  } catch {
    return res.status(502).json({ error: locale === 'en' ? 'Atlas could not complete the safety-checked analysis. Please try again.' : 'Atlas no pudo completar el análisis con control de seguridad. Inténtalo de nuevo.' });
  }
}
