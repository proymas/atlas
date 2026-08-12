import { put } from '@vercel/blob';
import crypto from 'node:crypto';

const ALLOWED = new Set([
  'landing_view','validator_started','question_viewed','question_answered','questionnaire_completed',
  'report_generated','analysis_error','screening_blocked','restart_clicked','pdf_downloaded','report_shared',
  'feedback_submitted','pro_waitlist_joined','locale_changed','experiment_step_completed',
  'free_analysis_available','free_limit_reached','free_analysis_consumed','pro_upsell_viewed',
  'continue_free_clicked','pricing_viewed','commercial_intent','checkout_started','checkout_redirected'
]);

function cleanObject(value = {}) {
  const allowed = [
    'locale','step','total','durationMs','score','verdict','maturity','profile','mode','questionDimension',
    'errorCode','rating','completed','experimentProgress','source','tier','billing','partner','ref','campaign','landingPath'
  ];
  return Object.fromEntries(allowed.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
}

function sessionId(req, supplied) {
  if (typeof supplied === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied)) return supplied;
  const seed = `${req.headers['x-forwarded-for'] || ''}|${req.headers['user-agent'] || ''}|${Date.now()}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 24);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  if (!ALLOWED.has(body.name)) return res.status(400).json({ error: 'Invalid event' });

  const event = {
    id: crypto.randomUUID(),
    name: body.name,
    sessionId: sessionId(req, body.sessionId),
    version: String(body.version || 'current'),
    locale: body.locale === 'en' ? 'en' : 'es',
    country: req.headers['x-vercel-ip-country'] || 'unknown',
    createdAt: new Date().toISOString(),
    data: cleanObject(body.data)
  };

  console.log(JSON.stringify({ type: 'atlas_product_event', ...event }));

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(202).json({ ok: true, persisted: false, reason: 'blob_not_configured' });
  }

  const day = event.createdAt.slice(0, 10);
  const pathname = `analytics/events/${day}/${event.createdAt.replace(/[:.]/g, '-')}-${event.id}.json`;
  await put(pathname, JSON.stringify(event), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false
  });
  return res.status(202).json({ ok: true, persisted: true });
}
