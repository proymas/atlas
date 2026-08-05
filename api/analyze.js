const UPSTREAM = "https://atlas-validator.vercel.app/api/analyze";

const MODE_BY_STAGE = { screen: "questions", report: "report" };
const PROTECTIVE_CONTEXT = /\b(prevenir|prevencion|proteger|proteccion|detectar|deteccion|defender|defensa|seguridad|ciberseguridad|anti[- ]?fraude|concienciacion|educacion|auditoria|cumplimiento|mitigar|mitigacion|prevent|protect|detect|defend|defense|security|cybersecurity|anti[- ]?fraud|awareness|education|audit|compliance|mitigate)\b/i;
const PROHIBITED_PATTERNS = [/\bsim\s*swap(?:ping)?\b/i,/\bduplicar\s+(?:una\s+)?sim\b/i,/\brobar\s+(?:una\s+)?linea\s+(?:movil|telefonica)\b/i,/\bsecuestr(?:ar|o)\s+(?:una\s+)?linea\s+(?:movil|telefonica)\b/i,/\bphishing\s*(?:kit|service|as a service)?\b/i,/\brobo\s+de\s+credenciales\b/i,/\bcredential\s+(?:theft|stealing|harvesting)\b/i,/\bcarding\b/i,/\bransomware\s*(?:as a service|service)?\b/i,/\bmalware\s*(?:as a service|service)?\b/i,/\brobo\s+de\s+identidad\b/i,/\bidentity\s+theft\b/i];

function normalizeText(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function requestText(body){const answerText=Array.isArray(body.answers)?body.answers.map(item=>`${item?.question||""} ${item?.answer||""}`).join(" "):"";return normalizeText(`${body.idea||""} ${answerText}`);}
function isLocallyProhibited(body){const text=requestText(body);return PROHIBITED_PATTERNS.some(pattern=>pattern.test(text))&&!PROTECTIVE_CONTEXT.test(text);}
function requestedLocale(body){return body.locale==='en'||body.language==='en'||body.language==='English'?'en':'es';}
function blockedResponse(locale){return locale==='en'?{status:'blocked',classification:'prohibited',reason:'Atlas does not analyze or provide plans for fraud, impersonation, credential theft or telecommunications abuse.'}:{status:'blocked',classification:'prohibited',reason:'Atlas no analiza ni proporciona planes para fraude, suplantación, robo de credenciales o abuso de telecomunicaciones.'};}
function languageDirective(locale){return locale==='en'
  ? 'MANDATORY OUTPUT LANGUAGE: ENGLISH ONLY. Write every question, reason, verdict, summary, list item, heading value and experiment step in natural English. Never answer in Spanish or mix languages.'
  : 'IDIOMA OBLIGATORIO DE SALIDA: SOLO ESPAÑOL. Escribe cada pregunta, motivo, veredicto, resumen, elemento de lista y paso del experimento en español natural. Nunca respondas en inglés ni mezcles idiomas.';}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{
    const body={...req.body};
    const locale=requestedLocale(body);
    if(isLocallyProhibited(body)) return res.status(200).json(blockedResponse(locale));
    if(!body.mode&&body.stage) body.mode=MODE_BY_STAGE[body.stage];
    delete body.stage;
    if(!body.mode) return res.status(400).json({error:locale==='en'?'Invalid mode':'Modo inválido'});

    const directive=languageDirective(locale);
    body.language=locale;
    body.locale=locale;
    body.outputLanguage=locale==='en'?'English':'Spanish';
    body.languageInstruction=directive;
    body.idea=`${String(body.idea||'').trim()}\n\n[${directive}]`;

    const upstreamResponse=await fetch(UPSTREAM,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const text=await upstreamResponse.text();
    let data;
    try{data=JSON.parse(text);}catch{return res.status(502).json({error:locale==='en'?'Invalid response from analysis engine':'Respuesta inválida del motor de análisis'});}
    return res.status(upstreamResponse.status).json(data);
  }catch{
    return res.status(502).json({error:'Atlas could not complete the analysis. Please try again.'});
  }
}
