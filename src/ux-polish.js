const REDUCED=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const STYLE_ID='atlas-ux-polish';
const MODALS='.workspace-modal,.atlas-auth-modal,.vc-modal,.experiment-modal,.copilot-modal,.compare-modal,.upgrade-modal,[role="dialog"]';
const CLOSE='[data-workspace-close],.atlas-auth-close,.vc-close,.experiment-close,[data-copilot-close],[data-compare-close],[data-upgrade-close],[aria-label="Close"],[aria-label="Cerrar"]';
let lastTrigger=null;
let locked=false;
let previousOverflow='';

function reduced(){return REDUCED?.matches===true;}
function visible(el){
  if(!(el instanceof HTMLElement)||!el.isConnected||el.hidden||el.classList.contains('hidden'))return false;
  const style=getComputedStyle(el);
  return style.display!=='none'&&style.visibility!=='hidden';
}

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    :root{--atlas-ux-ease:cubic-bezier(.22,.8,.24,1)}
    html{scroll-behavior:smooth}
    #progress-bar{transition:width 360ms var(--atlas-ux-ease)!important}
    .workspace-card,.report-grid article,.preview-columns section{transition:translate 170ms var(--atlas-ux-ease)}
    @media(hover:hover) and (pointer:fine){.workspace-card:hover,.report-grid article:hover,.preview-columns section:hover{translate:0 -2px}}
    .workspace-toast{animation:atlasToastLife 1700ms var(--atlas-ux-ease) both}
    @keyframes atlasToastLife{0%{opacity:0;translate:0 8px}12%,82%{opacity:1;translate:0 0}100%{opacity:0;translate:0 4px}}
    .workspace-empty{position:relative;overflow:hidden}
    .workspace-empty::before{content:'✦';display:block;margin:0 auto 9px;width:30px;height:30px;line-height:30px;border-radius:999px;font-size:12px;color:var(--blue);background:rgba(91,201,255,.07);border:1px solid rgba(91,201,255,.16)}
    .atlas-char-count{display:flex;justify-content:flex-end;min-height:18px;margin:-8px 2px 9px;color:var(--muted);font-size:11px;letter-spacing:.02em;opacity:0;transition:opacity 120ms ease}
    textarea:focus+.atlas-char-count,.atlas-char-count.is-visible{opacity:.72}
    .atlas-busy{position:relative}
    .atlas-busy::after{content:'';display:inline-block;width:12px;height:12px;margin-left:8px;vertical-align:-1px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:atlasBusySpin 650ms linear infinite}
    @keyframes atlasBusySpin{to{rotate:1turn}}
    .atlas-action-confirm{animation:atlasConfirm 360ms var(--atlas-ux-ease)}
    @keyframes atlasConfirm{50%{scale:.985}100%{scale:1}}
    @media(max-width:700px){.workspace-card:hover,.report-grid article:hover,.preview-columns section:hover{translate:none}.atlas-char-count{font-size:10.5px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}#progress-bar,.workspace-card,.report-grid article,.preview-columns section,.atlas-char-count{transition:none!important}.workspace-toast,.atlas-busy::after,.atlas-action-confirm{animation:none!important}}
  `;
  document.head.appendChild(style);
}

function syncScrollLock(){
  const open=[...document.querySelectorAll(MODALS)].some(el=>visible(el)&&!el.closest('.hidden'));
  if(open&&!locked){
    locked=true;
    previousOverflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';
  }else if(!open&&locked){
    locked=false;
    document.documentElement.style.overflow=previousOverflow;
  }
}

function restoreTrigger(){
  requestAnimationFrame(()=>{
    if(lastTrigger?.isConnected&&visible(lastTrigger))lastTrigger.focus({preventScroll:true});
  });
}

function bindEscapeAndFocus(){
  document.addEventListener('pointerdown',event=>{
    const target=event.target instanceof Element?event.target.closest('button,a,[role="button"]'):null;
    if(target instanceof HTMLElement&&!target.matches(CLOSE))lastTrigger=target;
  },{capture:true,passive:true});

  document.addEventListener('click',event=>{
    const close=event.target instanceof Element?event.target.closest(CLOSE):null;
    if(close)requestAnimationFrame(restoreTrigger);
  },{passive:true});

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const roots=[...document.querySelectorAll(MODALS)].filter(el=>visible(el)&&!el.closest('.hidden'));
    const root=roots.at(-1);
    if(!root)return;
    const close=root.querySelector(CLOSE)||root.closest(MODALS)?.querySelector(CLOSE);
    if(close instanceof HTMLElement){
      event.preventDefault();
      close.click();
      restoreTrigger();
    }
  });
}

function addIdeaCounter(){
  const idea=document.getElementById('idea');
  if(!(idea instanceof HTMLTextAreaElement)||idea.nextElementSibling?.classList.contains('atlas-char-count'))return;
  const counter=document.createElement('div');
  counter.className='atlas-char-count';
  counter.setAttribute('aria-live','polite');
  idea.insertAdjacentElement('afterend',counter);
  const update=()=>{
    const length=idea.value.trim().length;
    const english=document.documentElement.lang==='en';
    counter.textContent=length
      ? `${length} ${english?'characters':'caracteres'}${length<12?` · ${english?'add a little more detail':'añade un poco más de detalle'}`:''}`
      : '';
    counter.classList.toggle('is-visible',Boolean(length));
  };
  idea.addEventListener('input',update,{passive:true});
  window.addEventListener('atlas:locale',update);
  update();
}

function bindBusyStates(){
  const ids=['start-button','answer-button','pdf-button'];
  const sync=button=>{
    if(!(button instanceof HTMLButtonElement))return;
    const busy=button.disabled&&button.id==='pdf-button';
    button.classList.toggle('atlas-busy',busy);
    if(busy)button.setAttribute('aria-busy','true');else button.removeAttribute('aria-busy');
  };
  ids.forEach(id=>{
    const button=document.getElementById(id);
    if(!(button instanceof HTMLButtonElement))return;
    sync(button);
    new MutationObserver(()=>sync(button)).observe(button,{attributes:true,attributeFilter:['disabled']});
  });
}

function bindActionFeedback(){
  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('button'):null;
    if(!(button instanceof HTMLButtonElement)||button.disabled)return;
    if(!button.matches('.workspace-actions button,.workspace-primary,.workspace-secondary,.report-actions button'))return;
    button.classList.remove('atlas-action-confirm');
    requestAnimationFrame(()=>button.classList.add('atlas-action-confirm'));
    setTimeout(()=>button.classList.remove('atlas-action-confirm'),380);
  },{passive:true});
}

function bindLanguageKeyboard(){
  const switcher=document.querySelector('.language-switcher');
  if(!switcher)return;
  switcher.setAttribute('role','group');
  switcher.addEventListener('keydown',event=>{
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    const buttons=[...switcher.querySelectorAll('[data-locale]')];
    const current=buttons.indexOf(document.activeElement);
    if(current<0)return;
    event.preventDefault();
    const next=event.key==='ArrowRight'?(current+1)%buttons.length:(current-1+buttons.length)%buttons.length;
    buttons[next].focus();
    buttons[next].click();
  });
}

function observeUi(){
  let pending=0;
  const observer=new MutationObserver(()=>{
    if(pending)return;
    pending=requestAnimationFrame(()=>{pending=0;syncScrollLock();});
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
  syncScrollLock();
}

function init(){
  installStyles();
  addIdeaCounter();
  bindBusyStates();
  bindActionFeedback();
  bindEscapeAndFocus();
  bindLanguageKeyboard();
  observeUi();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
