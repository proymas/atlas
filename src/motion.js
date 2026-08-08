const REDUCED=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const INTRO_KEY='atlas_intro_seen';
const STYLE_ID='atlas-motion-system';
const BUTTONS='button,.button,.secondary-button,.text-button,.workspace-open,.atlas-account-button,.language-switcher button,.atlas-header-center>a';
const SURFACES='.workspace-modal,.copilot-modal,.compare-modal,.experiment-modal,.upgrade-modal,.modal,.overlay,.drawer,.sheet,.popover,[role="dialog"]';

function reduced(){return REDUCED?.matches===true;}

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    :root{--atlas-motion-ease:cubic-bezier(.22,.8,.24,1)}
    ${BUTTONS}{-webkit-tap-highlight-color:transparent;transition:translate 125ms var(--atlas-motion-ease),scale 125ms var(--atlas-motion-ease)!important}
    @media(hover:hover) and (pointer:fine){${BUTTONS}:not(:disabled):hover{translate:0 -1px}}
    ${BUTTONS}:not(:disabled):active{translate:0 1px;scale:.975;transition-duration:65ms!important}
    .atlas-intro{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#050a14;pointer-events:auto;opacity:1;contain:strict;transition:opacity 250ms var(--atlas-motion-ease),visibility 250ms linear}
    .atlas-intro-logo{color:#f5fbff;font-size:clamp(28px,7vw,54px);font-weight:850;letter-spacing:.28em;padding-left:.28em;opacity:0;transform:translateY(5px) scale(.98);animation:atlasLogoIn 440ms var(--atlas-motion-ease) 45ms forwards}
    .atlas-intro-line{position:absolute;left:50%;top:calc(50% + 46px);width:0;height:1px;background:linear-gradient(90deg,transparent,rgba(92,207,255,.85),rgba(123,110,255,.8),transparent);transform:translateX(-50%);opacity:.75;animation:atlasLine 460ms var(--atlas-motion-ease) 140ms forwards}
    .atlas-intro.is-leaving{opacity:0;pointer-events:none;visibility:hidden}
    @keyframes atlasLogoIn{to{opacity:1;transform:none}}
    @keyframes atlasLine{to{width:min(48vw,250px)}}
    @media(max-width:700px){${BUTTONS}:not(:disabled):active{scale:.985}}
    @media(prefers-reduced-motion:reduce){${BUTTONS}{transition:none!important;translate:none!important;scale:none!important}.atlas-intro,.atlas-intro-logo,.atlas-intro-line{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);
}

function isVisible(node){
  if(!(node instanceof HTMLElement)||!node.isConnected||node.hidden||node.classList.contains('hidden'))return false;
  return getComputedStyle(node).display!=='none';
}

function panelFor(root){
  if(root.classList.contains('workspace-modal'))return root.querySelector('.workspace-panel');
  return root.querySelector('.panel,[role="dialog"]')||root;
}

function animateOpen(root){
  if(reduced()||!isVisible(root))return;
  const panel=panelFor(root);
  if(!(panel instanceof HTMLElement))return;
  panel.getAnimations?.().filter(a=>a.id==='atlas-open').forEach(a=>a.cancel());
  const animation=panel.animate([{opacity:0,translate:'0 7px'},{opacity:1,translate:'0 0'}],{duration:185,easing:'cubic-bezier(.22,.8,.24,1)'});
  animation.id='atlas-open';
}

const states=new WeakMap();
function remember(root){
  if(!(root instanceof HTMLElement)||!root.matches(SURFACES))return;
  if(!states.has(root))states.set(root,isVisible(root));
}

let observer=null;
function startObserver(){
  if(observer||reduced()||document.hidden)return;
  document.querySelectorAll(SURFACES).forEach(remember);
  observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='childList'){
        for(const node of record.addedNodes){
          if(!(node instanceof HTMLElement))continue;
          if(node.matches?.(SURFACES)){states.set(node,isVisible(node));if(isVisible(node))requestAnimationFrame(()=>animateOpen(node));}
          node.querySelectorAll?.(SURFACES).forEach(surface=>{states.set(surface,isVisible(surface));if(isVisible(surface))requestAnimationFrame(()=>animateOpen(surface));});
        }
        continue;
      }
      const root=record.target;
      if(!(root instanceof HTMLElement)||!root.matches(SURFACES))continue;
      const before=states.get(root)??false;
      const after=isVisible(root);
      states.set(root,after);
      if(!before&&after)requestAnimationFrame(()=>animateOpen(root));
    }
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
}
function stopObserver(){observer?.disconnect();observer=null;}

function runIntro(){
  if(reduced())return;
  try{if(sessionStorage.getItem(INTRO_KEY)==='1')return;sessionStorage.setItem(INTRO_KEY,'1');}catch{}
  const intro=document.createElement('div');
  intro.className='atlas-intro';
  intro.setAttribute('aria-hidden','true');
  const logo=document.createElement('div');
  logo.className='atlas-intro-logo';
  logo.textContent='ATLAS';
  const line=document.createElement('div');
  line.className='atlas-intro-line';
  intro.append(logo,line);
  document.body.prepend(intro);
  const previous=document.documentElement.style.overflow;
  document.documentElement.style.overflow='hidden';
  setTimeout(()=>{intro.classList.add('is-leaving');document.documentElement.style.overflow=previous;setTimeout(()=>intro.remove(),280);},800);
}

function init(){
  installStyles();
  startObserver();
  document.addEventListener('visibilitychange',()=>document.hidden?stopObserver():startObserver());
  runIntro();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
