import { post } from './api.js';
import { APP_VERSION } from './config.js';
import { getLocale } from './i18n.js';

const SESSION_KEY = 'atlas_session_id';
const START_KEY = 'atlas_analysis_started_at';
const ATTRIBUTION_KEY = 'atlas_partner_attribution_v1';
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ONCE_PER_SESSION = new Set(['landing_view', 'free_analysis_available', 'pricing_viewed']);
const trackedOnce = new Set();

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID().replaceAll('-', '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function cleanToken(value) {
  const token = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(token) ? token : '';
}

function captureAttribution() {
  try {
    const params = new URLSearchParams(location.search);
    const partner = cleanToken(params.get('ref') || params.get('partner'));
    const campaign = cleanToken(params.get('campaign') || params.get('utm_campaign'));
    if (partner) {
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
        partner,
        ref: partner,
        campaign: campaign || undefined,
        landingPath: `${location.pathname}${location.search}`.slice(0, 240),
        capturedAt: Date.now()
      }));
    }
  } catch {}
}

export function getAttribution() {
  captureAttribution();
  try {
    const value = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || 'null');
    if (!value?.partner || !value?.capturedAt || Date.now() - Number(value.capturedAt) > ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(ATTRIBUTION_KEY);
      return {};
    }
    return {
      partner: cleanToken(value.partner),
      ref: cleanToken(value.ref || value.partner),
      campaign: cleanToken(value.campaign),
      landingPath: String(value.landingPath || '').slice(0, 240)
    };
  } catch {
    return {};
  }
}

export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = makeId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function markAnalysisStarted() {
  sessionStorage.setItem(START_KEY, String(Date.now()));
}

export function analysisDurationMs() {
  const started = Number(sessionStorage.getItem(START_KEY));
  return Number.isFinite(started) && started > 0 ? Date.now() - started : undefined;
}

export function track(name, data = {}) {
  if (ONCE_PER_SESSION.has(name)) {
    if (trackedOnce.has(name)) return;
    trackedOnce.add(name);
  }
  post('/api/event', {
    name,
    data: { ...getAttribution(), ...data },
    sessionId: getSessionId(),
    locale: getLocale(),
    version: APP_VERSION
  }).catch(() => {});
}

captureAttribution();
