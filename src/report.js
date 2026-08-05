import { byId, safeText } from './dom.js';
import { getLocale, t } from './i18n.js';
import { renderList, setProgress, showView } from './ui.js';

const VERDICT_MAP = {
  es: {
    discard: 'DESCARTAR', rejected: 'DESCARTAR', reject: 'DESCARTAR', 'do not build': 'NO CONSTRUIR TODAVÍA',
    reformulate: 'REFORMULAR Y PROBAR', reshape: 'REFORMULAR Y PROBAR', validate: 'VALIDAR ANTES DE CONSTRUIR',
    'validate before building': 'VALIDAR ANTES DE CONSTRUIR', 'idea not eligible': 'IDEA NO EVALUABLE'
  },
  en: {
    descartar: 'DISCARD', rechazada: 'DISCARD', rechazado: 'DISCARD', 'no construir todavía': 'DO NOT BUILD YET',
    reformular: 'REFRAME AND TEST', 'reformular y probar': 'REFRAME AND TEST', validar: 'VALIDATE BEFORE BUILDING',
    'validar antes de construir': 'VALIDATE BEFORE BUILDING', 'idea no evaluable': 'IDEA NOT ELIGIBLE'
  }
};

function normalizeVerdict(value) {
  const text = safeText(value);
  if (!text) return t('runtime.defaultVerdict');
  const key = text.toLowerCase().trim();
  return VERDICT_MAP[getLocale()]?.[key] || text;
}

export function renderReport(report = {}) {
  byId('score').textContent = Number.isFinite(Number(report.score)) ? Math.round(Number(report.score)) : '—';
  byId('verdict').textContent = normalizeVerdict(report.verdict);
  byId('summary').textContent = safeText(report.executiveSummary || report.summary) || t('runtime.defaultSummary');
  renderList('strengths', report.strengths);
  renderList('risks', report.risks);
  renderList('assumptions', report.criticalAssumptions || report.assumptions);
  renderList('do-not-build', report.doNotBuildYet);
  const experiment = report.experiment || report.validationExperiment || {};
  byId('experiment-name').textContent = safeText(experiment.name) || t('runtime.experiment');
  renderList('experiment-steps', experiment.steps);
}

export async function revealReport(report) {
  setProgress(96, t('runtime.reportReady'));
  await new Promise((resolve) => setTimeout(resolve, 650));
  renderReport(report);
  showView('report-view');
  setProgress(100, t('runtime.completed'));
}
