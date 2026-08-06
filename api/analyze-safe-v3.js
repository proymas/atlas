import analyzeHandler from './analyze.js';

const clean = value => String(value || '').trim();
const normalize = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const list = value => Array.isArray(value) ? value.filter(Boolean) : [];
const localeOf = body => body?.locale === 'en' || body?.language === 'en' || body?.language === 'English' ? 'en' : 'es';

const DEFENSIVE = /\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|antifraude|educacion|investigacion|periodismo|auditoria|cumplimiento|mitigar|rehabilitacion|desradicalizacion|victima|prevent|protect|detect|defend|security|cybersecurity|anti.?fraud|education|research|journalism|audit|compliance|mitigate|rehabilitation|deradicali[sz]ation|victim)\b/i;
const LAWFUL_DISTANCE = /\b(historia|historico|historica|documental|novela|ficcion|analisis academico|estudio academico|museo|memoria historica|history|historical|documentary|novel|fiction|academic analysis|academic study|museum)\b/i;

const DOMAINS = {
  violent_extremism: /\b(eta|isis|daesh|al.?qaeda|terroris|yihad|jihad|extremis|insurgenc|guerrill|milicia|militia|reactivacion armada|reactivacion violenta|lucha armada|armed revival|armed struggle|violent uprising|atentado|bomba|explosiv|secuestro|asesin|matar|sabotaje violento)\b/i,
  cybercrime: /\b(phishing|carding|ransomware|malware|sim.?swap|robo de credenciales|credential theft|credential harvesting|hackear|intrusion no autorizada|botnet|keylogger|stealer|doxx|bypass de seguridad)\b/i,
  fraud: /\b(estafa|fraude|suplantacion|identity theft|robo de identidad|blanqueo|lavado de dinero|money laundering|falsificar|documentos falsos|counterfeit|fake documents|ponzi|piramidal)\b/i,
  exploitation: /\b(trafico de personas|human trafficking|explotacion sexual|sexual exploitation|trabajo forzado|forced labor|secuestro|kidnap|extorsion|extortion)\b/i,
  weapons_drugs: /\b(arma ilegal|armas ilegales|weapon trafficking|trafico de armas|bomba casera|veneno|cocaina|heroina|metanfetamina|fentanilo|drug trafficking|trafico de drogas)\b/i,
  privacy_abuse: /\b(acechar|stalk|espiar a|spy on|doxx|invadir privacidad|trackear sin permiso|seguimiento clandestino)\b/i
};

const INTENTS = {
  create: /\b(crear|montar|fundar|reactivar|resucitar|relanzar|organizar|poner en marcha|start|build|create|found|revive|reactivate|relaunch|organize|set up)\b/i,
  recruit: /\b(reclutar|captar miembros|sumar gente|unirse|afiliar|militantes|perfiles dispuestos|recruit|members|join|affiliates|supporters)\b/i,
  finance: /\b(financiar|recaudar fondos|donantes|funding|finance|donors|raise money)\b/i,
  source: /\b(conseguir armas|conseguir explosivos|abastecer|proveedor clandestino|obtain weapons|obtain explosives|illegal supplier)\b/i,
  evade: /\b(evitar deteccion|evadir|ocultar identidad|sin dejar rastro|burlar controles|avoid detection|evade|hide identity|leave no trace|bypass controls)\b/i,
  target: /\b(seleccionar objetivos|a quien atacar|quien seria vulnerable|select targets|who to attack|vulnerable people)\b/i,
  execute: /\b(paso a paso|como llevarlo a cabo|plan operativo|logistica operativa|step by step|how to carry it out|operational plan|operational logistics)\b/i
};

const ORGANIZED = /\b(grupo|organizacion|celula|comando|movimiento armado|red clandestina|group|organization|cell|command|armed movement|clandestine network)\b/i;
const EUPHEMISM = /\b(reactivacion|resistencia|causa|operacion especial|accion directa|justicia por mano propia|servicio discreto|comunidad de accion|revival|resistance|cause|special operation|direct action|vigilante justice|discreet service|action community)\b/i;
const DIRECT_OUTPUT = /\b(recluta miembros|capta miembros|financia la organizacion|consigue armas|consigue explosivos|selecciona objetivos|evita deteccion|oculta tu identidad|crea una celula|recruit members|fund the organization|obtain weapons|obtain explosives|select targets|avoid detection|hide your identity|create a cell)\b/i;

function requestText(body) {
  const answers = list(body?.answers).map(item => `${item?.question || ''} ${item?.answer || ''}`).join(' ');
  return normalize(`${body?.idea || ''} ${answers}`);
}

function matches(map, text) {
  return Object.entries(map).filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
}

function assess(text) {
  const domains = matches(DOMAINS, text);
  const intents = matches(INTENTS, text);
  const defensive = DEFENSIVE.test(text);
  const lawfulDistance = LAWFUL_DISTANCE.test(text);
  const organized = ORGANIZED.test(text);
  const euphemism = EUPHEMISM.test(text);
  const operational = intents.length > 0;
  const clearDefensive = defensive && !operational;
  const explicitHarm = domains.length > 0;
  const disguisedHarm = euphemism && organized && intents.length >= 1;
  const prohibited = !clearDefensive && ((explicitHarm && operational) || (domains.includes('violent_extremism') && organized) || disguisedHarm);
  const sensitive = !prohibited && explicitHarm && !lawfulDistance;
  return { classification: prohibited ? 'prohibited' : sensitive ? 'sensitive' : 'allowed', domains, intents, defensive, lawfulDistance, organized, euphemism };
}

function blocked(locale, category) {
  return locale === 'en'
    ? { status: 'blocked', classification: 'prohibited', category, reason: 'Atlas cannot help plan, organize, fund, recruit for, equip, target or conceal illegal or seriously harmful activity. It can help with prevention, compliance, victim support or lawful alternatives.' }
    : { status: 'blocked', classification: 'prohibited', category, reason: 'Atlas no puede ayudar a planificar, organizar, financiar, reclutar, equipar, seleccionar objetivos u ocultar actividades ilegales o gravemente dañinas. Sí puede ayudar con prevención, cumplimiento, apoyo a víctimas o alternativas legales.' };
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
  try { return normalize(JSON.stringify(data)); } catch { return normalize(data); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = { ...(req.body || {}) };
  const locale = localeOf(body);
  const inputText = requestText(body);
  const input = assess(inputText);

  if (input.classification === 'prohibited') {
    return res.status(200).json(blocked(locale, input.domains[0] || 'harmful_or_illegal'));
  }

  try {
    const result = await invokeAnalyze({ ...req, body });
    if (result.statusCode >= 400) return res.status(result.statusCode).json(result.data);
    if (result.data?.status === 'blocked' || result.data?.classification === 'prohibited') return res.status(200).json(result.data);

    const generated = outputText(result.data);
    const output = assess(generated);
    const outputHasRealRiskDomain = output.domains.length > 0;
    const directOperationalHarm = outputHasRealRiskDomain && DIRECT_OUTPUT.test(generated);

    if (directOperationalHarm || (input.domains.length > 0 && output.classification === 'prohibited')) {
      return res.status(200).json(blocked(locale, output.domains[0] || input.domains[0] || 'unsafe_output'));
    }

    return res.status(result.statusCode).json({
      ...result.data,
      safety: {
        classification: input.classification === 'sensitive' ? 'sensitive' : 'allowed',
        reviewed: true,
        gateVersion: 'security-gate-3'
      }
    });
  } catch {
    return res.status(502).json({ error: locale === 'en' ? 'Atlas could not complete the safety-checked analysis. Please try again.' : 'Atlas no pudo completar el análisis con control de seguridad. Inténtalo de nuevo.' });
  }
}
