import { getLocale } from './i18n.js';

const STYLE_ID='atlas-header-fix-styles';

function ensureStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .nav .workspace-open{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      width:auto!important;
      min-width:88px!important;
      min-height:40px!important;
      height:40px!important;
      padding:0 13px!important;
      font-size:11px!important;
      line-height:1!important;
      font-weight:850!important;
      letter-spacing:.02em!important;
      color:var(--text)!important;
      white-space:nowrap!important;
      overflow:visible!important;
      text-indent:0!important;
      visibility:visible!important;
      opacity:1!important;
    }
    .nav .workspace-open::before,
    .nav .workspace-open::after{content:none!important;display:none!important}
    @media(max-width:430px){
      .nav .workspace-open{min-width:82px!important;padding:0 10px!important;font-size:10.5px!important}
    }
  `;
  document.head.appendChild(style);
}

function fixProjectsButton(){
  ensureStyles();
  const button=document.querySelector('.nav .workspace-open');
  if(!button)return false;
  const label=getLocale()==='en'?'Projects':'Proyectos';
  if(button.textContent!==label)button.textContent=label;
  button.setAttribute('aria-label',label);
  button.title=label;
  return true;
}

function observeHeader(){
  fixProjectsButton();
  const host=document.querySelector('.nav-actions')||document.querySelector('.nav');
  if(!host)return;
  const observer=new MutationObserver(()=>fixProjectsButton());
  observer.observe(host,{childList:true,subtree:true,characterData:true});
}

window.addEventListener('atlas:locale',()=>queueMicrotask(fixProjectsButton));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeHeader,{once:true});
else observeHeader();

export { fixProjectsButton };
