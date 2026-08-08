const REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const INTRO_KEY = 'atlas_intro_seen';
const MOTION_STYLE_ID = 'atlas-motion-system';

function reducedMotion(){ return REDUCED?.matches === true; }

function installMotionStyles(){
  if(document.getElementById(MOTION_STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=MOTION_STYLE_ID;
  style.textContent=`
    :root{--atlas-ease:cubic-bezier(.22,.8,.24,1);--atlas-fast:160ms;--atlas-medium:260ms}

    button,.button,.secondary-button,.text-button,.workspace-open,.atlas-account-button,
    .language-switcher button,.atlas-header-center>a{
      transition:transform var(--atlas-fast) var(--atlas-ease),box-shadow var(--atlas-fast) var(--atlas-ease),border-color var(--atlas-fast) ease,background-color var(--atlas-fast) ease,opacity var(--atlas-fast) ease,filter var(--atlas-fast) ease!important;
      transform:translateZ(0);
      -webkit-tap-highlight-color:transparent;
    }
    @media(hover:hover) and (pointer:fine){
      button:not(:disabled):hover,.button:hover,.secondary-button:hover,.workspace-open:hover,.atlas-account-button:hover{
        transform:translateY(-1px);
        filter:brightness(1.045);
      }
    }
    button:not(:disabled):active,.button:active,.secondary-button:active,.workspace-open:active,.atlas-account-button:active,
    .language-switcher button:active,.atlas-header-center>a:active{
      transform:translateY(0) scale(.975)!important;
      transition-duration:80ms!important;
    }
    button:focus-visible,.button:focus-visible,.secondary-button:focus-visible,.workspace-open:focus-visible,
    .atlas-account-button:focus-visible,.language-switcher button:focus-visible,.atlas-header-center>a:focus-visible{
      outline:2px solid rgba(95,205,255,.8)!important;
      outline-offset:3px!important;
    }

    .atlas-motion-enter{
      animation:atlasSurfaceIn var(--atlas-medium) var(--atlas-ease) both;
      transform-origin:50% 30%;
    }
    @keyframes atlasSurfaceIn{
      from{opacity:0;transform:translateY(10px) scale(.988)}
      to{opacity:1;transform:translateY(0) scale(1)}
    }

    .atlas-intro{
      position:fixed;inset:0;z-index:2147483000;
      display:grid;place-items:center;
      background:#050a14;
      pointer-events:auto;
      opacity:1;
      transition:opacity 360ms var(--atlas-ease),visibility 360ms linear;
    }
    .atlas-intro::before{
      content:'';position:absolute;width:min(62vw,560px);aspect-ratio:1;border-radius:50%;
      background:radial-gradient(circle,rgba(85,184,255,.13),rgba(111,105,255,.055) 42%,transparent 70%);
      filter:blur(10px);opacity:0;
      animation:atlasGlow 900ms var(--atlas-ease) forwards;
    }
    .atlas-intro-logo{
      position:relative;color:#f5fbff;font-size:clamp(28px,7vw,54px);font-weight:850;
      letter-spacing:.28em;padding-left:.28em;
      opacity:0;transform:translateY(8px) scale(.96);
      text-shadow:0 0 30px rgba(95,205,255,.14);
      animation:atlasLogoIn 620ms var(--atlas-ease) 80ms forwards;
    }
    .atlas-intro-line{
      position:absolute;left:50%;top:calc(50% + 48px);width:0;height:1px;
      background:linear-gradient(90deg,transparent,rgba(92,207,255,.9),rgba(123,110,255,.85),transparent);
      transform:translateX(-50%);opacity:.8;
      animation:atlasLine 620ms var(--atlas-ease) 230ms forwards;
    }
    .atlas-intro.is-leaving{opacity:0;pointer-events:none;visibility:hidden}
    @keyframes atlasLogoIn{to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes atlasGlow{to{opacity:1}}
    @keyframes atlasLine{to{width:min(52vw,280px)}}

    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{scroll-behavior:auto!important}
      .atlas-motion-enter{animation:none!important}
      .atlas-intro,.atlas-intro-logo,.atlas-intro::before,.atlas-intro-line{animation:none!important;transition:none!important}
      button,.button,.secondary-button,.text-button,.workspace-open,.atlas-account-button,.language-switcher button,.atlas-header-center>a{transition:none!important;transform:none!important}
    }
  `;
  document.head.appendChild(style);
}

function looksLikeSurface(node){
  if(!(node instanceof HTMLElement)) return false;
  const signature=`${node.id} ${typeof node.className==='string'?node.className:''}`.toLowerCase();
  return /(modal|overlay|drawer|sheet|dialog|popover|panel|workspace|copilot|compare|experiment|upgrade)/.test(signature);
}

function animateSurface(node){
  if(reducedMotion() || !looksLikeSurface(node) || node.dataset.atlasMotion==='1') return;
  node.dataset.atlasMotion='1';
  node.classList.add('atlas-motion-enter');
  node.addEventListener('animationend',()=>node.classList.remove('atlas-motion-enter'),{once:true});
}

function observeDynamicUi(){
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof HTMLElement)) continue;
        animateSurface(node);
        node.querySelectorAll?.('[class],[id]').forEach(animateSurface);
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
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
  document.documentElement.style.overflow='hidden';

  const leave=()=>{
    intro.classList.add('is-leaving');
    document.documentElement.style.overflow='';
    setTimeout(()=>intro.remove(),420);
  };
  setTimeout(leave,1050);
}

function init(){
  installMotionStyles();
  observeDynamicUi();
  runIntro();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
