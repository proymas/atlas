export const APP_VERSION = '';

export const VIEW_IDS = ['start-view', 'question-view', 'loading-view', 'report-view'];

export const LOADING_MESSAGES = [
  'Interpretando la información aportada…',
  'Evaluando la calidad de la evidencia…',
  'Identificando supuestos y riesgos…',
  'Preparando el experimento de siete días…',
];

export const FALLBACK_QUESTIONS = [
  { question: '¿Quién es el cliente exacto y qué problema urgente tiene?', reason: 'Claridad del cliente' },
  { question: '¿Qué evidencia real tienes de que ese problema existe?', reason: 'Calidad de evidencia' },
  { question: '¿Cómo consiguen hoy los clientes resolverlo?', reason: 'Alternativas actuales' },
  { question: '¿Cómo llegarías a tus primeros diez usuarios?', reason: 'Distribución' },
  { question: '¿Qué señal medible demostraría que merece la pena continuar?', reason: 'Criterio de validación' },
];
