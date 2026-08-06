import { post } from './api.js';
import { APP_VERSION } from './config.js';
import { getLocale } from './i18n.js';

const SESSION_KEY = 'atlas_session_id';
const START_KEY = 'atlas_analysis_started_at';

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID().replaceAll('-', '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
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
  post('/api/event', {
    name,
    data,
    sessionId: getSessionId(),
    locale: getLocale(),
    version: APP_VERSION
  }).catch(() => {});
}
