import { byId, safeText } from './dom.js';
import { t } from './i18n.js';
import { renderList, setProgress, showView } from './ui.js';

export function renderReport(report = {}) {
  byId('score').textContent = Number.isFinite(Number(report.score)) ? Math.round(Number(report.score)) : '—';
  byId('verdict').textContent = safeText(report.verdict) || t('runtime.defaultVerdict');
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
