import { getLocale } from './i18n.js';

const STYLE_ID='atlas-header-fix-styles';

function ensureStyles(){
  let style=document.getElementById(STYLE_ID);
  if(!style){
    style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .site-header .nav .workspace-open{
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
      .site-header .nav .workspace-open::before,
      .site-header .nav .workspace-open::after{content:none!important;display:none!important}

      @media(max-width:700px){
        .site-header .nav{
          display:grid!important;
          grid-template-columns:auto minmax(0,1fr)!important;
          grid-template-areas:"brand controls"!important;
          align-items:start!important;
          column-gap:14px!important;
          row-gap:0!important;
          min-height:auto!important;
          padding-top:10px!important;
          padding-bottom:10px!important;
        }
        .site-header .brand{
          grid-area:brand!important;
          align-self:start!important;
          margin-top:9px!important;
          white-space:nowrap!important;
        }
        .site-header .nav>nav{display:none!important}
        .site-header .nav-actions{
          grid-area:controls!important;
          display:grid!important;
          grid-template-columns:auto auto minmax(82px,1fr)!important;
          grid-template-areas:"account account account" "plan language projects"!important;
          align-items:center!important;
          justify-content:stretch!important;
          width:100%!important;
          min-width:0!important;
          gap:7px 8px!important;
          margin:0!important;
        }
        .site-header .atlas-account-button{
          grid-area:account!important;
          position:static!important;
          inset:auto!important;
          transform:none!important;
          justify-self:end!important;
          align-self:center!important;
          width:auto!important;
          max-width:min(100%,230px)!important;
          min-width:0!important;
          min-height:38px!important;
          margin:0!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
          white-space:nowrap!important;
        }
        .site-header .atlas-plan-badge{
          grid-area:plan!important;
          position:static!important;
          transform:none!important;
          justify-self:start!important;
          margin:0!important;
        }
        .site-header .language-switcher{
          grid-area:language!important;
          justify-self:start!important;
          margin:0!important;
        }
        .site-header .nav .workspace-open{
          grid-area:projects!important;
          justify-self:end!important;
          min-width:88px!important;
          height:40px!important;
          margin:0!important;
          font-size:11px!important;
        }
        .site-header .nav-actions>.button-small:not(.workspace-open){display:none!important}
      }

      @media(max-width:430px){
        .site-header .nav{column-gap:10px!important}
        .site-header .brand span{display:none!important}
        .site-header .nav-actions{
          grid-template-columns:auto auto minmax(76px,1fr)!important;
          gap:6px!important;
        }
        .site-header .atlas-account-button{max-width:100%!important;font-size:10.5px!important}
        .site-header .nav .workspace-open{min-width:78px!important;padding:0 9px!important;font-size:10px!important}
      }

      @media(max-width:350px){
        .site-header .nav{
          grid-template-columns:1fr!important;
          grid-template-areas:"brand" "controls"!important;
          row-gap:8px!important;
        }
        .site-header .brand{margin-top:0!important}
        .site-header .nav-actions{
          grid-template-columns:auto auto 1fr!important;
          grid-template-areas:"account account account" "plan language projects"!important;
        }
        .site-header .atlas-account-button{justify-self:start!important;max-width:100%!important}
      }
    `;
  }
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
