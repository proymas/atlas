import { getLocale } from './i18n.js';

let initialized=false;
let workspaceObserver=null;
let queued=false;
const copy=()=>getLocale()==='en'?{
  historyLocked:'Older project history is available with Atlas Pro.',
  historyCta:'Explore Atlas Pro',
  pdfFree:'Download basic PDF',
  pdfPro:'Download full PDF',
  pdfHint:'Atlas Pro unlocks the complete project export with the full validation pack.'
}:{
  historyLocked:'El historial anterior del proyecto está disponible con Atlas Pro.',
  historyCta:'Explorar Atlas Pro',
  pdfFree:'Descargar PDF básico',
  pdfPro:'Descargar PDF completo',
  pdfHint:'Atlas Pro desbloquea la exportación completa del proyecto con todo el paquete de validación.'
};

function isPro(){return window.AtlasEntitlements?.isPro?.()===true;}
function ensureStyles(){if(document.getElementById('atlas-history-pdf-gating-styles'))return;const style=document.createElement('style');style.id='atlas-history-pdf-gating-styles';style.textContent=`.atlas-history-lock{margin-top:12px;padding:15px;border:1px solid rgba(91,201,255,.3);border-radius:14px;background:linear-gradient(135deg,rgba(91,201,255,.1),rgba(123,140,255,.05));color:var(--muted)}.atlas-history-lock strong{display:block;margin-bottom:5px;color:var(--text)}.atlas-history-lock button{margin-top:10px;border:1px solid rgba(91,201,255,.4);border-radius:10px;background:rgba(91,201,255,.1);color:var(--text);padding:9px 11px;cursor:pointer;font-weight:800}.atlas-pdf-tier-note{display:block;margin-top:7px;max-width:360px;color:var(--muted);font-size:11px;line-height:1.45}`;document.head.appendChild(style);}
function applyHistory(){const list=document.querySelector('.workspace-timeline-list');if(!list)return;const events=[...list.querySelectorAll('.workspace-event')];const old=list.querySelector('.atlas-history-lock');events.forEach(el=>{el.hidden=false;});if(isPro()||events.length<=5){old?.remove();return;}events.slice(5).forEach(el=>{el.hidden=true;});const c=copy();let lock=old;if(!lock){lock=document.createElement('div');lock.className='atlas-history-lock';lock.innerHTML='<strong>Atlas Pro</strong><span></span><button type="button"></button>';lock.querySelector('button').addEventListener('click',()=>window.dispatchEvent(new CustomEvent('atlas:upgrade-intent',{detail:{source:'history_limit'}})));list.appendChild(lock);}lock.querySelector('span').textContent=c.historyLocked;lock.querySelector('button').textContent=c.historyCta;}
function applyPdf(){const button=document.getElementById('pdf-button');if(!button)return;const c=copy();button.textContent=isPro()?c.pdfPro:c.pdfFree;let note=document.querySelector('.atlas-pdf-tier-note');if(isPro()){note?.remove();return;}if(!note){note=document.createElement('span');note.className='atlas-pdf-tier-note';button.insertAdjacentElement('afterend',note);}if(note.textContent!==c.pdfHint)note.textContent=c.pdfHint;}
function refresh(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;applyHistory();applyPdf();attachWorkspaceObserver();});}
function attachWorkspaceObserver(){const target=document.getElementById('workspace-list');if(!target||workspaceObserver?.target===target)return;workspaceObserver?.observer?.disconnect();const observer=new MutationObserver(refresh);observer.observe(target,{childList:true,subtree:false});workspaceObserver={target,observer};}
function onRelevantClick(event){if(event.target?.closest?.('.workspace-open,.workspace-back,[data-action="timeline"],[data-workspace-close]'))refresh();}
export function initHistoryPdfGating(){if(initialized)return;ensureStyles();document.addEventListener('click',onRelevantClick);window.addEventListener('atlas:entitlements',refresh);window.addEventListener('atlas:locale',refresh);window.addEventListener('atlas:auth',refresh);refresh();initialized=true;}
initHistoryPdfGating();
