const REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const INTRO_KEY = 'atlas_intro_seen';
const MOTION_STYLE_ID = 'atlas-motion-system';
const SURFACE_SELECTOR = '[role="dialog"]:not(#workspace-modal .workspace-panel),.modal:not(.workspace-modal),.overlay,.drawer,.sheet,.popover,.panel:not(.workspace-panel),.copilot-modal,.compare-modal,.experiment-modal,.upgrade-modal';
const BUTTON_SELECTOR = 'button,.button,.secondary-button,.text-button,.workspace-open,.atlas-account-button,.language-switcher button,.atlas-header-center>a';

function reducedMotion(){ return REDUCED?.matches === true; }

function installMotionStyles(){
  if(document.getElementById(MOTION_STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=MOTION_STYLE_ID;
  style.textContent=`
    :root{--atlas-ease:cubic-bezier(.22,.8,.24,1);--atlas-medium:190ms}

    ${BUTTON_SELECTOR}{
      -webkit-tap-highlight-color:transparent;
    }
    ${BUTTON_SELECTOR}:focus-visible{
      outline:2px solid rgba(95,205,255,.8)!important;
      outline-offset:3px!important;
    }

    .atlas-motion-enter{
      animation:atlasSurfaceIn var(--atlas-medium) var(--atlas-ease) both;
      will-change:transform,opacity;
    }
    @keyframes atlasSurfaceIn{
      from{opacity:0;transform:translateY(6px)}
      to{opacity:1;transform:translateY(0)}
    }

    .atlas-intro{
      position:fixed;inset:0;z-index:2147483000;
      display:grid;place-items:center;
      background:#050a14;
      pointer-events:auto;
      opacity:1;
      contain:strict;
      transition:opacity 260ms var(--atlas-ease),visibility 260ms linear;
    }
    .atlas-intro::before{
      content:'';position:absolute;width:min(58vw,480px);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle,rgba(85,184,255,.11),rgba(111,105,255,.045) 42%,transparent 70%);
      opacity:0;
      animation:atlasGlow 620ms var(--atlas-ease) forwards;
    }
    .atlas-intro-logo{
      position:relative;color:#f5fbff;font-size:clamp(28px,7vw,54px);font-weight:850;
      letter-spacing:.28em;padding-left:.28em;
      opacity:0;transform:translateY(6px) scale(.975);
      text-shadow:0 0 20px rgba(95,205,255,.12);
      animation:atlasLogoIn 460ms var(--atlas-ease) 50ms forwards;
      will-change:transform,opacity;
    }
    .atlas-intro-line{
      position:absolute;left:50%;top:calc(50% + 46px);width:0;height:1px;
      background:linear-gradient(90deg,transparent,rgba(92,207,255,.85),rgba(123,110,255,.8),transparent);
      transform:translateX(-50%);opacity:.75;
      animation:atlasLine 480ms var(--atlas-ease) 150ms forwards;
      will-change:width;
    }
    .atlas-intro.is-leaving{opacity:0;pointer-events:none;visibility:hidden}
    @keyframes atlasLogoIn{to{opacity:1;transform:none}}
    @keyframes atlasGlow{to{opacity:1}}
    @keyframes atlasLine{to{width:min(48vw,250px)}}

    @media(max-width:700px){
      .atlas-motion-enter{animation-duration:160ms}
      .atlas-intro::before{display:none}
      .atlas-intro-logo{text-shadow:none}
    }

    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{scroll-behavior:auto!important}
      .atlas-motion-enter{animation:none!important;will-change:auto!important}
      .atlas-intro,.atlas-intro-logo,.atlas-intro::before,.atlas-intro-line{
        animation:none!important;transition:none!important;will-change:auto!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function looksLikeSurface(node){
  if(!(node instanceof HTMLElement)) return false;
  if(node.id==='workspace-modal' || node.classList.contains('workspace-panel')) return false;
  return node.matches?.(SURFACE_SELECTOR) === true;
}

function animateSurface(node){
  if(reducedMotion() || !looksLikeSurface(node) || node.dataset.atlasMotion==='1') return false;
  node.dataset.atlasMotion='1';
  node.classList.add('atlas-motion-enter');
  node.addEventListener('animationend',()=>{
    node.classList.remove('atlas-motion-enter');
    node.style.willChange='auto';
  },{once:true});
  return true;
}

function animateButtonPress(target){
  if(reducedMotion() || !(target instanceof HTMLElement) || target.matches(':disabled')) return;
  target.getAnimations?.().filter(animation=>animation.id==='atlas-button-press').forEach(animation=>animation.cancel());
  const animation=target.animate(
    [
      {transform:'translateY(0) scale(1)'},
      {transform:'translateY(1px) scale(.965)'},
      {transform:'translateY(0) scale(1)'}
    ],
    {duration:135,easing:'cubic-bezier(.22,.8,.24,1)'}
  );
  animation.id='atlas-button-press';
}

function bindButtonMotion(){
  document.addEventListener('pointerdown',event=>{
    const target=event.target instanceof Element?event.target.closest(BUTTON_SELECTOR):null;
    if(target) animateButtonPress(target);
  },{passive:true});
}

let observer=null;
function startObserver(){
  if(observer || reducedMotion() || document.hidden) return;
  observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof HTMLElement)) continue;
        if(animateSurface(node)) continue;
        const surface=node.querySelector?.(SURFACE_SELECTOR);
        if(surface && surface.id!=='workspace-modal' && !surface.classList.contains('workspace-panel')) animateSurface(surface);
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
}
function stopObserver(){observer?.disconnect();observer=null;}
function observeDynamicUi(){
  startObserver();
  document.addEventListener('visibilitychange',()=>document.hidden?stopObserver():startObserver());
}

function runIntro(){
  if(reducedMotion()) return;
  try{
    if(sessionStorage.getItem(INTRO_KEY)==='1') return;
    sessionStorage.setItem(INTRO_KEY,'1');
  }catch{}

  const intro=document.createElement('div');
  intro.className='atlas-intro';
  intro.setAttribute('aria-hidden','true');
  intro.innerHTML='<div class="atlas-intro-logo">ATLAS</div><div class="atlas-intro-line"></div>';
  document.body.prepend(intro);
  const previousOverflow=document.documentElement.style.overflow;
  document.documentElement.style.overflow='hidden';

  const leave=()=>{
    intro.classList.add('is-leaving');
    document.documentElement.style.overflow=previousOverflow;
    setTimeout(()=>intro.remove(),300);
  };
  setTimeout(leave,820);
}

function init(){
  installMotionStyles();
  bindButtonMotion();
  observeDynamicUi();
  runIntro();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
