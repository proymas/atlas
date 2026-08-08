import { getLocale } from './i18n.js';

const STYLE_ID='atlas-header-layout-styles';
let scheduled=false;

function ensureStyles(){
  let style=document.getElementById(STYLE_ID);
  if(!style){
    style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .site-header .atlas-header-grid{
        display:grid!important;
        grid-template-columns:minmax(190px,auto) minmax(300px,1fr) minmax(260px,auto)!important;
        align-items:center!important;
        gap:24px!important;
        min-height:82px!important;
        padding-top:8px!important;
        padding-bottom:8px!important;
      }
      .site-header .atlas-header-left{
        display:grid!important;
        gap:7px!important;
        justify-items:start!important;
        min-width:0!important;
      }
      .site-header .atlas-header-left-controls{
        display:flex!important;
        align-items:center!important;
        gap:7px!important;
        min-height:38px!important;
        min-width:0!important;
      }
      .site-header .atlas-header-center{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:7px!important;
        min-width:0!important;
        margin:0!important;
      }
      .site-header .atlas-header-center a{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:36px!important;
        padding:0 12px!important;
        border:1px solid rgba(132,180,240,.14)!important;
        border-radius:999px!important;
        background:rgba(10,25,44,.48)!important;
        color:#9fb2ca!important;
        font-size:12px!important;
        font-weight:750!important;
        white-space:nowrap!important;
        text-decoration:none!important;
        transition:border-color .18s,background .18s,color .18s,transform .18s!important;
      }
      .site-header .atlas-header-center a:hover,
      .site-header .atlas-header-center a:focus-visible{
        color:#f5fbff!important;
        border-color:rgba(99,212,255,.36)!important;
        background:rgba(20,48,78,.66)!important;
      }
      .site-header .atlas-header-right{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:7px!important;
        min-width:0!important;
        flex-wrap:nowrap!important;
      }
      .site-header .atlas-plan-badge{
        position:static!important;
        inset:auto!important;
        transform:none!important;
        margin:0!important;
        flex:0 0 auto!important;
      }
      .site-header .language-switcher{
        margin:0!important;
        flex:0 0 auto!important;
      }
      .site-header .atlas-account-button{
        position:static!important;
        inset:auto!important;
        transform:none!important;
        max-width:170px!important;
        min-width:0!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
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
        visibility:visible!important;
        opacity:1!important;
      }
      .site-header .nav .workspace-open::before,
      .site-header .nav .workspace-open::after{content:none!important;display:none!important}
      .atlas-explore-trigger,.atlas-explore-menu{display:none}

      @media(max-width:1180px){
        .site-header .atlas-header-grid{
          grid-template-columns:minmax(170px,auto) minmax(250px,1fr) minmax(220px,auto)!important;
          gap:16px!important;
        }
        .site-header .atlas-header-center{gap:5px!important}
        .site-header .atlas-header-center a{padding:0 9px!important;font-size:11px!important}
        .site-header .atlas-header-cta{display:none!important}
        .site-header .atlas-account-button{max-width:145px!important}
      }

      @media(max-width:820px){
        .site-header .atlas-header-grid{
          grid-template-columns:minmax(150px,auto) minmax(180px,1fr) minmax(190px,auto)!important;
          gap:12px!important;
        }
        .site-header .brand span{display:none!important}
        .site-header .atlas-header-center a{padding:0 8px!important;font-size:10.5px!important}
        .site-header .atlas-account-button{max-width:128px!important;font-size:10.5px!important}
      }

      @media(max-width:560px){
        .site-header{background:rgba(4,8,17,.97)!important}
        .site-header .atlas-header-grid{
          position:relative!important;
          grid-template-columns:minmax(118px,auto) minmax(70px,1fr) minmax(108px,auto)!important;
          align-items:start!important;
          gap:10px!important;
          min-height:auto!important;
          padding-top:10px!important;
          padding-bottom:10px!important;
        }
        .site-header .atlas-header-left{gap:8px!important}
        .site-header .brand{font-size:14px!important;letter-spacing:.13em!important;min-height:38px!important;display:flex!important;align-items:center!important}
        .site-header .atlas-header-left-controls{gap:5px!important;align-items:center!important;flex-wrap:nowrap!important}
        .site-header .atlas-plan-badge{min-height:36px!important;padding-left:9px!important;padding-right:9px!important;font-size:10px!important}
        .site-header .language-switcher{min-height:40px!important;padding:3px!important;gap:2px!important}
        .site-header .language-switcher>span{display:none!important}
        .site-header .language-switcher button{min-width:34px!important;min-height:34px!important;padding:4px 6px!important;font-size:10px!important}

        .site-header .atlas-header-center{
          position:relative!important;
          display:flex!important;
          align-self:center!important;
          justify-content:center!important;
          min-height:40px!important;
          padding-top:2px!important;
        }
        .site-header .atlas-header-center>a{display:none!important}
        .site-header .atlas-explore-trigger{
          display:inline-flex!important;
          align-items:center!important;
          justify-content:center!important;
          gap:6px!important;
          min-height:40px!important;
          padding:0 11px!important;
          border:1px solid rgba(99,212,255,.28)!important;
          border-radius:999px!important;
          background:linear-gradient(145deg,rgba(12,31,52,.9),rgba(5,13,25,.92))!important;
          color:#c4d4e7!important;
          font:inherit!important;
          font-size:10px!important;
          font-weight:800!important;
          cursor:pointer!important;
          white-space:nowrap!important;
        }
        .site-header .atlas-explore-trigger::after{content:'⌄';font-size:11px;transition:transform .18s}
        .site-header .atlas-explore-trigger[aria-expanded="true"]::after{transform:rotate(180deg)}
        .site-header .atlas-explore-menu{
          position:absolute!important;
          top:calc(100% + 7px)!important;
          left:50%!important;
          transform:translateX(-50%) translateY(-4px)!important;
          z-index:100!important;
          display:grid!important;
          min-width:164px!important;
          padding:6px!important;
          border:1px solid rgba(99,212,255,.24)!important;
          border-radius:15px!important;
          background:rgba(5,15,28,.98)!important;
          box-shadow:0 18px 48px rgba(0,0,0,.46)!important;
          opacity:0!important;
          visibility:hidden!important;
          pointer-events:none!important;
          transition:opacity .16s,transform .16s,visibility .16s!important;
        }
        .site-header .atlas-explore-menu[data-open="true"]{
          opacity:1!important;
          visibility:visible!important;
          pointer-events:auto!important;
          transform:translateX(-50%) translateY(0)!important;
        }
        .site-header .atlas-explore-menu a{
          display:flex!important;
          align-items:center!important;
          min-height:38px!important;
          padding:0 10px!important;
          border-radius:10px!important;
          color:#b7c9dc!important;
          text-decoration:none!important;
          font-size:11px!important;
          font-weight:750!important;
        }
        .site-header .atlas-explore-menu a:hover{background:rgba(99,212,255,.08)!important;color:white!important}

        .site-header .atlas-header-right{
          display:grid!important;
          grid-template-columns:1fr!important;
          justify-items:end!important;
          align-content:start!important;
          gap:7px!important;
        }
        .site-header .atlas-header-cta{display:none!important}
        .site-header .atlas-account-button{
          max-width:118px!important;
          min-height:38px!important;
          padding:7px 10px!important;
          font-size:10px!important;
        }
        .site-header .nav .workspace-open{
          min-width:86px!important;
          height:38px!important;
          min-height:38px!important;
          padding:0 10px!important;
          font-size:10px!important;
        }
      }

      @media(max-width:390px){
        .site-header .atlas-header-grid{
          grid-template-columns:minmax(112px,auto) minmax(62px,1fr) minmax(98px,auto)!important;
          gap:7px!important;
        }
        .site-header .atlas-plan-badge{padding-left:7px!important;padding-right:7px!important}
        .site-header .language-switcher button{min-width:31px!important;padding:3px 5px!important}
        .site-header .atlas-explore-trigger{padding:0 8px!important;font-size:9.5px!important}
        .site-header .atlas-account-button{max-width:104px!important;padding-left:8px!important;padding-right:8px!important}
        .site-header .nav .workspace-open{min-width:78px!important;padding:0 8px!important;font-size:9.5px!important}
      }

      @media(max-width:340px){
        .site-header .atlas-header-grid{
          grid-template-columns:1fr auto!important;
          grid-template-areas:"left right" "center center"!important;
        }
        .site-header .atlas-header-left{grid-area:left!important}
        .site-header .atlas-header-center{grid-area:center!important;justify-self:center!important}
        .site-header .atlas-header-right{grid-area:right!important}
      }
    `;
  }
  document.head.appendChild(style);
}

function localeLabel(){return getLocale()==='en'?'Explore':'Explorar';}

function ensureExploreMenu(){
  const center=document.querySelector('.atlas-header-center');
  if(!center)return;
  let trigger=center.querySelector('.atlas-explore-trigger');
  let menu=center.querySelector('.atlas-explore-menu');
  if(!trigger){
    trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='atlas-explore-trigger';
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-haspopup','true');
    center.appendChild(trigger);
  }
  if(!menu){
    menu=document.createElement('div');
    menu.className='atlas-explore-menu';
    menu.setAttribute('role','menu');
    center.appendChild(menu);
  }
  trigger.textContent=localeLabel();
  const links=[...center.querySelectorAll(':scope > a')];
  menu.innerHTML='';
  links.forEach(link=>{
    const clone=link.cloneNode(true);
    clone.removeAttribute('style');
    clone.addEventListener('click',()=>closeExplore());
    menu.appendChild(clone);
  });
  if(!trigger.dataset.bound){
    trigger.dataset.bound='1';
    trigger.addEventListener('click',event=>{
      event.stopPropagation();
      const open=menu.dataset.open!=='true';
      menu.dataset.open=String(open);
      trigger.setAttribute('aria-expanded',String(open));
    });
  }
}

function closeExplore(){
  const menu=document.querySelector('.atlas-explore-menu');
  const trigger=document.querySelector('.atlas-explore-trigger');
  if(menu)menu.dataset.open='false';
  if(trigger)trigger.setAttribute('aria-expanded','false');
}

function organizeHeader(){
  ensureStyles();
  const leftControls=document.querySelector('.atlas-header-left-controls');
  const right=document.querySelector('.atlas-header-right');
  const plan=document.querySelector('.atlas-plan-badge');
  const workspace=document.querySelector('.workspace-open');
  const account=document.querySelector('.atlas-account-button');
  const cta=document.querySelector('.atlas-header-cta');
  if(leftControls&&plan&&plan.parentElement!==leftControls)leftControls.prepend(plan);
  if(right){
    if(workspace&&workspace.parentElement!==right)right.appendChild(workspace);
    if(account&&account.parentElement!==right)right.appendChild(account);
    if(cta&&cta.parentElement!==right)right.appendChild(cta);
  }
  if(workspace){
    const label=getLocale()==='en'?'Projects':'Proyectos';
    if(workspace.textContent!==label)workspace.textContent=label;
    workspace.setAttribute('aria-label',label);
    workspace.title=label;
  }
  ensureExploreMenu();
}

function scheduleOrganize(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    organizeHeader();
  });
}

function init(){
  organizeHeader();
  const header=document.querySelector('.site-header');
  if(header){
    const observer=new MutationObserver(scheduleOrganize);
    observer.observe(header,{childList:true,subtree:true});
  }
  document.addEventListener('click',event=>{
    if(!event.target.closest('.atlas-header-center'))closeExplore();
  });
  window.addEventListener('resize',()=>{if(innerWidth>560)closeExplore();},{passive:true});
}

window.addEventListener('atlas:locale',()=>queueMicrotask(()=>{organizeHeader();}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

export { organizeHeader };
