import { post } from './api.js';
import { FALLBACK_QUESTIONS, LOADING_MESSAGES } from './config.js';
import { byId, safeText } from './dom.js';
import { renderReport, revealReport } from './report.js';
import { resetState, state } from './state.js';
import { track } from './tracking.js';
import { renderList, setProgress, showView } from './ui.js';

let loadingTimer;

function startLoading() {
  let index = 0;
  byId('loading-copy').textContent = LOADING_MESSAGES[index];
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    index = (index + 1) % LOADING_MESSAGES.length;
    byId('loading-copy').textContent = LOADING_MESSAGES[index];
  }, 900);
}

function stopLoading() {
  clearInterval(loadingTimer);
}

function renderQuestion() {
  showView('question-view');
  const total = state.questions.length;
  const question = state.questions[state.index] || {};
  byId('question-title').textContent = question.question || question.text || 'Cuéntanos un poco más';
  byId('question-reason').textContent = question.reason || question.dimension || 'Pregunta adaptada';
  byId('answer').value = '';
  setProgress(15 + (state.index / Math.max(1, total)) * 55, `Pregunta ${state.index + 1} de ${total}`);
  byId('answer').focus();
}

function renderBlocked(result) {
  showView('report-view');
  setProgress(100, 'Análisis detenido');
  renderReport({
    score: 0,
    verdict: 'IDEA NO EVALUABLE',
    summary: safeText(result.reason) || 'Atlas no analiza ni proporciona planes para actividades ilegales o dañinas.',
    strengths: [],
    risks: ['La actividad descrita no puede recibir asistencia comercial.'],
    assumptions: [],
    doNotBuildYet: ['No continúes con esta idea. Reformúlala hacia una actividad legal y segura.'],
    experiment: {
      name: 'Siguiente paso seguro',
      steps: ['Describe una alternativa legal que resuelva un problema real sin causar daño.'],
    },
  });
  track('screening_blocked');
}

async function startAnalysis() {
  const idea = safeText(byId('idea').value);
  byId('start-error').textContent = '';
  if (idea.length < 12) {
    byId('start-error').textContent = 'Describe la idea con un poco más de detalle.';
    return;
  }

  state.idea = idea;
  byId('start-button').disabled = true;
  showView('loading-view');
  setProgress(12, 'Analizando idea');
  startLoading();
  track('validator_started');

  try {
    const result = await post('/api/analyze', { stage: 'screen', idea, language: 'es' });
    if (result.status === 'blocked' || result.classification === 'prohibited') {
      stopLoading();
      renderBlocked(result);
      return;
    }
    state.questions = Array.isArray(result.questions) && result.questions.length
      ? result.questions
      : FALLBACK_QUESTIONS;
    state.answers = [];
    state.index = 0;
    stopLoading();
    renderQuestion();
  } catch (error) {
    stopLoading();
    showView('start-view');
    setProgress(0, 'Paso 1 de 1');
    byId('start-error').textContent = error.message;
  } finally {
    byId('start-button').disabled = false;
  }
}

async function submitAnswer() {
  const value = safeText(byId('answer').value);
  if (value.length < 3) {
    byId('answer').focus();
    return;
  }

  state.answers.push({ question: byId('question-title').textContent, answer: value });
  state.index += 1;
  if (state.index < state.questions.length) {
    renderQuestion();
    return;
  }

  showView('loading-view');
  setProgress(78, 'Preparando informe');
  startLoading();
  track('questionnaire_completed', { questions: state.questions.length });

  try {
    const report = await post('/api/analyze', {
      stage: 'report',
      idea: state.idea,
      answers: state.answers,
      language: 'es',
    });
    state.report = report;
    stopLoading();
    await revealReport(report);
    track('report_generated', { score: report.score, verdict: report.verdict });
  } catch (error) {
    stopLoading();
    showView('question-view');
    state.index = Math.max(0, state.questions.length - 1);
    byId('question-title').textContent = 'No se pudo generar el informe';
    byId('question-reason').textContent = error.message;
    byId('answer').classList.add('hidden');
    byId('answer-button').textContent = 'Reintentar';
  }
}

function resetAnalysis() {
  resetState();
  byId('idea').value = '';
  byId('answer').classList.remove('hidden');
  byId('answer-button').textContent = 'Continuar';
  showView('start-view');
  setProgress(0, 'Paso 1 de 1');
  byId('idea').focus();
  track('restart_clicked');
}

async function shareReport() {
  const report = state.report || {};
  const text = `Atlas — ${report.verdict || 'Informe de validación'}\nPuntuación: ${report.score ?? '—'}/100\n${report.executiveSummary || report.summary || ''}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Atlas Validation Report', text, url: location.href });
    } else {
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      byId('share-button').textContent = 'Copiado';
      setTimeout(() => { byId('share-button').textContent = 'Compartir'; }, 1500);
    }
    track('report_shared');
  } catch {
    // Sharing can be cancelled by the user.
  }
}

function printReport() {
  track('pdf_downloaded');
  window.print();
}

function bindEvents() {
  byId('start-button').addEventListener('click', startAnalysis);
  byId('answer-button').addEventListener('click', submitAnswer);
  byId('restart-button').addEventListener('click', resetAnalysis);
  byId('new-analysis-button').addEventListener('click', resetAnalysis);
  byId('share-button').addEventListener('click', shareReport);
  byId('pdf-button').addEventListener('click', printReport);
  byId('idea').addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') startAnalysis();
  });
  byId('answer').addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submitAnswer();
  });
}

bindEvents();
track('landing_view');
