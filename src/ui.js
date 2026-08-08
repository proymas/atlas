import { byId, escapeHtml } from './dom.js';
import { VIEW_IDS } from './config.js';

let activeView='';

export function showView(id) {
  VIEW_IDS.forEach((viewId) => {
    const view=byId(viewId);
    const visible=viewId===id;
    view.classList.toggle('hidden',!visible);
    view.setAttribute('aria-hidden',visible?'false':'true');
    if(!visible)view.classList.remove('view-enter');
  });
  const next=byId(id);
  if(activeView!==id){
    next.classList.remove('view-enter');
    requestAnimationFrame(()=>next.classList.add('view-enter'));
    activeView=id;
  }
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
