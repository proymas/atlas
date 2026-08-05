import { post } from './api.js';
import { getLocale } from './i18n.js';
import { state } from './state.js';

const copy = {
  es: {
    feedbackTitle: 'Ayúdanos a mejorar Atlas', feedbackCopy: '¿Qué tan útil te resultó este análisis?', comment: '¿Qué mejorarías?', commentPlaceholder: 'Cuéntanos qué faltó, qué sobró o qué te resultó más útil', send: 'Enviar feedback', sent: 'Gracias. Tu feedback ha quedado registrado.', rating: 'Valoración',
    proTitle: '¿Quieres probar Atlas Pro?', proCopy: 'Apúntate a la lista de espera para recibir acceso prioritario cuando esté disponible.', email: 'Tu email', consent: 'Acepto que Atlas use este email únicamente para avisarme sobre Atlas Pro.', join: 'Apuntarme a Atlas Pro', joined: 'Ya estás en la lista de espera de Atlas Pro.', invalidEmail: 'Introduce un email válido y acepta el consentimiento.'
  },
  en: {
    feedbackTitle: 'Help us improve Atlas', feedbackCopy: 'How useful was this analysis?', comment: 'What would you improve?', commentPlaceholder: 'Tell us what was missing, excessive or most useful', send: 'Send feedback', sent: 'Thank you. Your feedback has been recorded.', rating: 'Rating',
    proTitle: 'Want to try Atlas Pro?', proCopy: 'Join the waitlist for priority access when it becomes available.', email: 'Your email', consent: 'I agree that Atlas may use this email only to notify me about Atlas Pro.', join: 'Join the Atlas Pro waitlist', joined: 'You are now on the Atlas Pro waitlist.', invalidEmail: 'Enter a valid email and accept the consent.'
  }
};

function c(key) { return copy[getLocale()]?.[key] || copy.en[key]; }
function style() {
  if (document.getElementById('engagement-styles')) return;
  const node = document.createElement('style'); node.id = 'engagement-styles';
  node.textContent = `.engagement-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:26px}.engagement-card{padding:22px;border:1px solid rgba(132,180,240,.2);border-radius:20px;background:rgba(5,16,30,.62)}.engagement-card h4{margin:0 0 8px}.engagement-card p{color:var(--muted);line-height:1.55}.rating-row{display:flex;gap:8px;margin:14px 0}.rating-row button{width:42px;height:42px;border-radius:12px;border:1px solid var(--line-soft);background:rgba(255,255,255,.04);color:var(--text);font-weight:800}.rating-row button[aria-pressed=true]{border-color:var(--blue);background:rgba(99,212,255,.16)}.engagement-card input,.engagement-card textarea{width:100%;box-sizing:border-box;margin:8px 0 12px;padding:12px;border:1px solid var(--line-soft);border-radius:12px;background:#071525;color:var(--text)}.consent-row{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--muted);margin-bottom:12px}.consent-row input{width:auto;margin:3px 0}.engagement-status{min-height:22px;font-size:13px;color:var(--green)!important}@media(max-width:720px){.engagement-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(node);
}

function markup() {
  return `<div class="engagement-grid" id="engagement-grid">
    <section class="engagement-card"><h4>${c('feedbackTitle')}</h4><p>${c('feedbackCopy')}</p><div class="rating-row" aria-label="${c('rating')}">${[1,2,3,4,5].map(n=>`<button type="button" data-rating="${n}" aria-pressed="false">${n}</button>`).join('')}</div><label>${c('comment')}</label><textarea id="feedback-comment" placeholder="${c('commentPlaceholder')}"></textarea><button id="feedback-submit" class="secondary-button" type="button">${c('send')}</button><p id="feedback-status" class="engagement-status"></p></section>
    <section class="engagement-card"><h4>${c('proTitle')}</h4><p>${c('proCopy')}</p><label for="pro-email">${c('email')}</label><input id="pro-email" type="email" autocomplete="email"/><label class="consent-row"><input id="pro-consent" type="checkbox"/><span>${c('consent')}</span></label><button id="pro-submit" class="button" type="button">${c('join')}</button><p id="pro-status" class="engagement-status"></p></section>
  </div>`;
}

function bind() {
  let rating = 0;
  document.querySelectorAll('[data-rating]').forEach(button => button.addEventListener('click',()=>{rating=Number(button.dataset.rating);document.querySelectorAll('[data-rating]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));}));
  document.getElementById('feedback-submit')?.addEventListener('click',async()=>{if(!rating)return;const button=document.getElementById('feedback-submit');button.disabled=true;try{await post('/api/feedback',{rating,feedback:document.getElementById('feedback-comment').value,idea:state.idea,verdict:state.report?.verdict,score:state.report?.score,language:getLocale(),consent:false});document.getElementById('feedback-status').textContent=c('sent');}finally{button.disabled=false;}});
  document.getElementById('pro-submit')?.addEventListener('click',async()=>{const email=document.getElementById('pro-email').value.trim();const consent=document.getElementById('pro-consent').checked;const status=document.getElementById('pro-status');if(!/^\S+@\S+\.\S+$/.test(email)||!consent){status.textContent=c('invalidEmail');return;}const button=document.getElementById('pro-submit');button.disabled=true;try{await post('/api/feedback',{rating:5,feedback:'Atlas Pro waitlist',email,consent:true,idea:state.idea,verdict:state.report?.verdict,score:state.report?.score,language:getLocale()});status.textContent=c('joined');}finally{button.disabled=false;}});
}

export function renderEngagement() {
  style(); const report = document.getElementById('report-view'); if(!report)return;
  document.getElementById('engagement-grid')?.remove(); report.insertAdjacentHTML('beforeend', markup()); bind();
}
window.addEventListener('atlas:locale', renderEngagement);
