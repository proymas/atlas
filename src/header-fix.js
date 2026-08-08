import { getLocale } from './i18n.js';

const STYLE_ID='atlas-header-layout-styles';
let scheduled=false;

function ensureStyles(){
  let style=document.getElementById(STYLE_ID);
  if(!style){
    style=document.createElement('style');
    style.id=STYLE_ID;
  }
  style.textContent=`
    .site-header .atlas-header-grid{display:grid!important;grid-template-columns:minmax(190px,auto) minmax(300px,1fr) minmax(260px,auto)!important;align-items:center!important;gap:24px!important;min-height:82px!important;padding-top:8px!important;padding-bottom:8px!important}
    .site-header .atlas-header-left{display:grid!important;gap:7px!important;justify-items:start!important;min-width:0!important}
    .site-header .atlas-header-left-controls{display:flex!important;align-items:center!important;gap:7px!important;min-height:38px!important;min-width:0!important}
    .site-header .atlas-header-center{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:0!important;margin:0!important}
    .site-header .atlas-header-center>a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:36px!important;padding:0 12px!important;border:1px solid rgba(132,180,240,.14)!important;border-radius:999px!important;background:rgba(10,25,44,.48)!important;color:#9fb2ca!important;font-size:12px!important;font-weight:750!important;white-space:nowrap!important;text-decoration:none!important;transition:border-color .18s,background .18s,color .18s!important}
    .site-header .atlas-header-center>a:hover,.site-header .atlas-header-center>a:focus-visible{color:#f5fbff!important;border-color:rgba(99,212,255,.36)!important;background:rgba(20,48,78,.66)!important}
    .site-header .atlas-header-right{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;min-width:0!important;flex-wrap:nowrap!important}
    .site-header .atlas-plan-badge{position:static!important;inset:auto!important;transform:none!important;margin:0!important;flex:0 0 auto!important}
    .site-header .language-switcher{margin:0!important;flex:0 0 auto!important}
    .site-header .atlas-account-button{position:static!important;inset:auto!important;transform:none!important;max-width:170px!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    .site-header .nav .workspace-open{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-width:88px!important;min-height:40px!important;height:40px!important;padding:0 13px!important;font-size:11px!important;line-height:1!important;font-weight:850!important;letter-spacing:.02em!important;color:var(--text)!important;white-space:nowrap!important;visibility:visible!important;opacity:1!important}
    .site-header .nav .workspace-open::before,.site-header .nav .workspace-open::after{content:none!important;display:none!important}
    .atlas-explore-trigger,.atlas-explore-menu{display:none!important}

    @media(max-width:1180px){
      .site-header .atlas-header-grid{grid-template-columns:minmax(170px,auto) minmax(250px,1fr) minmax(220px,auto)!important;gap:16px!important}
      .site-header .atlas-header-center{gap:5px!important}
      .site-header .atlas-header-center>a{padding:0 9px!important;font-size:11px!important}
      .site-header .atlas-header-cta{display:none!important}
      .site-header .atlas-account-button{max-width:145px!important}
    }

    @media(max-width:820px) and (min-width:561px){
      .site-header .atlas-header-grid{grid-template-columns:minmax(150px,auto) minmax(180px,1fr) minmax(190px,auto)!important;gap:12px!important}
      .site-header .brand span{display:none!important}
      .site-header .atlas-header-center>a{padding:0 8px!important;font-size:10.5px!important}
      .site-header .atlas-account-button{max-width:128px!important;font-size:10.5px!important}
    }

    /* Mobile: controls first, Atlas centered, navigation last. */
    @media(max-width:560px){
      .site-header{background:rgba(4,8,17,.98)!important}
      .site-header .atlas-header-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;grid-template-areas:"controls-left controls-right" "brand brand" "center center"!important;align-items:center!important;gap:9px 10px!important;min-height:auto!important;padding-top:10px!important;padding-bottom:9px!important}
      .site-header .atlas-header-left{display:contents!important}
      .site-header .brand{grid-area:brand!important;justify-self:center!important;align-self:center!important;display:flex!important;align-items:center!important;min-height:38px!important;margin:1px 0!important;font-size:15px!important;letter-spacing:.16em!important;white-space:nowrap!important}
      .site-header .brand span{display:none!important}
      .site-header .atlas-header-left-controls{grid-area:controls-left!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;gap:6px!important;width:100%!important;min-width:0!important;min-height:40px!important}
      .site-header .atlas-plan-badge{position:static!important;inset:auto!important;transform:none!important;min-height:38px!important;margin:0!important;padding-left:10px!important;padding-right:10px!important;font-size:10px!important}
      .site-header .language-switcher{min-height:40px!important;margin:0!important;padding:3px!important;gap:2px!important}
      .site-header .language-switcher>span{display:none!important}
      .site-header .language-switcher button{min-width:36px!important;min-height:34px!important;padding:4px 7px!important;font-size:10.5px!important}

      .site-header .atlas-header-right{grid-area:controls-right!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:nowrap!important;gap:6px!important;width:100%!important;min-width:0!important}
      .site-header .atlas-account-button{position:static!important;inset:auto!important;transform:none!important;order:0!important;flex:1 1 auto!important;width:auto!important;max-width:min(31vw,150px)!important;min-width:0!important;min-height:40px!important;margin:0!important;padding:7px 9px!important;font-size:10px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      .site-header .nav .workspace-open{position:static!important;inset:auto!important;transform:none!important;order:1!important;flex:0 0 auto!important;display:inline-flex!important;width:auto!important;min-width:82px!important;height:40px!important;min-height:40px!important;margin:0!important;padding:0 9px!important;font-size:10px!important}
      .site-header .atlas-header-cta{display:none!important}

      .site-header .atlas-header-center{grid-area:center!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;width:100%!important;min-width:0!important;margin:0!important;padding-top:9px!important;border-top:1px solid rgba(132,180,240,.10)!important;overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;scroll-snap-type:x proximity!important}
      .site-header .atlas-header-center::-webkit-scrollbar{display:none!important}
      .site-header .atlas-header-center>a{display:inline-flex!important;flex:0 0 auto!important;min-height:34px!important;padding:0 11px!important;border-radius:999px!important;font-size:10.5px!important;scroll-snap-align:start!important}
    }

    @media(max-width:390px){
      .site-header .atlas-header-grid{gap:8px 7px!important}
      .site-header .atlas-header-left-controls,.site-header .atlas-header-right{gap:5px!important}
      .site-header .atlas-plan-badge{padding-left:8px!important;padding-right:8px!important}
      .site-header .language-switcher button{min-width:32px!important;padding:3px 5px!important}
      .site-header .atlas-account-button{max-width:29vw!important;padding-left:7px!important;padding-right:7px!important;font-size:9.5px!important}
      .site-header .nav .workspace-open{min-width:76px!important;padding:0 7px!important;font-size:9.5px!important}
      .site-header .atlas-header-center>a{padding:0 9px!important;font-size:10px!important}
    }

    @media(max-width:330px){
      .site-header .atlas-header-grid{grid-template-columns:1fr!important;grid-template-areas:"controls-left" "controls-right" "brand" "center"!important;gap:8px!important}
      .site-header .atlas-header-right{justify-content:flex-start!important}
      .site-header .atlas-account-button{max-width:58vw!important;flex:0 1 auto!important}
    }
  `;
  document.head.appendChild(style);
}

function removeExploreUi(){
  document.querySelectorAll('.atlas-explore-trigger,.atlas-explore-menu').forEach(node=>node.remove());
}

function organizeHeader(){
  ensureStyles();
  removeExploreUi();
  const leftControls=document.querySelector('.atlas-header-left-controls');
  const right=document.querySelector('.atlas-header-right');
  const plan=document.querySelector('.atlas-plan-badge');
  const workspace=document.querySelector('.workspace-open');
  const account=document.querySelector('.atlas-account-button');
  const cta=document.querySelector('.atlas-header-cta');

  if(leftControls&&plan&&plan.parentElement!==leftControls)leftControls.prepend(plan);
  if(right){
    if(account&&account.parentElement!==right)right.prepend(account);
    if(workspace&&workspace.parentElement!==right)right.appendChild(workspace);
    if(cta&&cta.parentElement!==right)right.appendChild(cta);
  }
  if(workspace){
    const label=getLocale()==='en'?'Projects':'Proyectos';
    if(workspace.textContent!==label)workspace.textContent=label;
    workspace.setAttribute('aria-label',label);
    workspace.title=label;
  }
}

function scheduleOrganize(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;organizeHeader();});
}

function init(){
  organizeHeader();
  const header=document.querySelector('.site-header');
  if(header){
    const observer=new MutationObserver(scheduleOrganize);
    observer.observe(header,{childList:true,subtree:true});
  }
}

window.addEventListener('atlas:locale',()=>queueMicrotask(organizeHeader));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

export { organizeHeader };
