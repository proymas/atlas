import { byId, escapeHtml } from './dom.js';
import { VIEW_IDS } from './config.js';

export function showView(id) {
  VIEW_IDS.forEach((viewId) => byId(viewId).classList.toggle('hidden', viewId !== id));
}

export function setProgress(value, label) {
  const bounded = Math.max(0, Math.min(100, value));
  byId('progress-bar').style.width = `${bounded}%`;
  byId('progress-label').textContent = `${Math.round(bounded)} %`;
  if (label) byId('step-label').textContent = label;
}

export function renderList(id, items) {
  const values = Array.isArray(items) ? items : [];
  byId(id).innerHTML = values.length
    ? values.map((item) => `<li>${escapeHtml(String(item))}</li>`).join('')
    : '<li>Sin datos suficientes.</li>';
}
