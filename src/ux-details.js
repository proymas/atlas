const REDUCED=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const STYLE_ID='atlas-ux-details';
const MODALS='.workspace-modal,.atlas-auth-modal,.vc-modal,.experiment-modal,.copilot-modal,.compare-modal,.upgrade-modal';
const TEXTAREAS='#idea,#answer,[data-copilot-input],.workspace-form textarea,.copilot-action-form textarea';
let toastTimer=0;

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
    :root{--atlas-detail-ease:cubic-bezier(.22,.8,.24,1)}
    .atlas-header-center>a{position:relative}
    .atlas-header-center>a::after{content:'';position:absolute;left:50%;right:50%;bottom:-7px;height:1px;background:currentColor;opacity:.6;transition:left 180ms var(--atlas-detail-ease),right 180ms var(--atlas-detail-ease),opacity 180ms ease;pointer-events:none}
    .atlas-header-center>a.is-active-section::after{left:14%;right:14%;opacity:.9}
    .atlas-header-center>a.is-active-section{opacity:1}
    .atlas-scroll-top{position:fixed;right:max(18px,var(--safe-right,0px));bottom:max(18px,var(--safe-bottom,0px));z-index:850;width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(132,180,240,.22);border-radius:14px;background:rgba(7,19,33,.88);color:var(--text);font:inherit;font-size:18px;cursor:pointer;backdrop-filter:blur(10px);opacity:0;visibility:hidden;translate:0 8px;transition:opacity 170ms ease,visibility 170ms linear,translate 190ms var(--atlas-detail-ease)}
    .atlas-scroll-top.is-visible{opacity:1;visibility:visible;translate:0 0}
    .atlas-toast-global{position:fixed;left:50%;bottom:max(24px,var(--safe-bottom,0px));z-index:2200;max-width:min(90vw,460px);padding:11px 14px;border:1px solid rgba(132,180,240,.24);border-radius:13px;background:rgba(7,19,33,.96);color:var(--text);box-shadow:0 18px 54px rgba(0,0,0,.28);font-size:13px;line-height:1.35;translate:-50% 8px;opacity:0;pointer-events:none;transition:opacity 160ms ease,translate 180ms var(--atlas-detail-ease)}
    .atlas-toast-global.is-visible{opacity:1;translate:-50% 0}
    .atlas-shortcut-hint{margin:-4px 2px 10px;color:var(--muted);font-size:10.5px;letter-spacing:.02em;opacity:.48;text-align:right;user-select:none}
    textarea[data-atlas-autogrow='1']{overflow-y:auto;transition:height 120ms var(--atlas-detail-ease)}
    @media(max-width:700px){.atlas-scroll-top{width:40px;height:40px;border-radius:13px}.atlas-shortcut-hint{display:none}.atlas-header-center>a::after{display:none}}
    @media(prefers-reduced-motion:reduce){.atlas-scroll-top,.atlas-toast-global,.atlas-header-center>a::after,textarea[data-atlas-autogrow='1']{transition:none!important}}
  `;
  document.head.appendChild(style);
}

function showToast(message){
  const text=String(message||'').trim();
  if(!text)return;
  let toast=document.querySelector('.atlas-toast-global');
  if(!toast){
    toast=document.createElement('div');
    toast.className='atlas-toast-global';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.appendChild(toast);
  }
  clearTimeout(toastTimer);
  toast.textContent=text;
  requestAnimationFrame(()=>toast.classList.add('is-visible'));
  toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),1900);
}

function bindToast(){
  window.addEventListener('atlas:toast',event=>showToast(event.detail?.message));
  window.AtlasToast=showToast;
}

function bindFocusTrap(){
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const roots=[...document.querySelectorAll(MODALS)].filter(visible);
    const root=roots.at(-1);
    if(!root)return;
    const focusable=[...root.querySelectorAll('a[href],button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(visible);
    if(focusable.length<2)return;
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
}

function grow(textarea){
  if(!(textarea instanceof HTMLTextAreaElement))return;
  textarea.dataset.atlasAutogrow='1';
  const min=textarea.id==='idea'?142:48;
  const max=textarea.matches('[data-copilot-input],.copilot-action-form textarea')?150:260;
  textarea.style.height='auto';
  const next=Math.max(min,Math.min(max,textarea.scrollHeight));
  textarea.style.height=`${next}px`;
}

function enhanceTextarea(textarea){
  if(!(textarea instanceof HTMLTextAreaElement)||textarea.dataset.atlasAutogrow==='1')return;
  grow(textarea);
  textarea.addEventListener('input',()=>grow(textarea),{passive:true});
}

function bindAutoGrow(){
  document.querySelectorAll(TEXTAREAS).forEach(enhanceTextarea);
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof HTMLElement))continue;
        if(node.matches?.(TEXTAREAS))enhanceTextarea(node);
        node.querySelectorAll?.(TEXTAREAS).forEach(enhanceTextarea);
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

function addShortcutHints(){
  const english=()=>document.documentElement.lang==='en';
  const attach=(textarea,copy)=>{
    if(!(textarea instanceof HTMLTextAreaElement)||textarea.parentElement?.querySelector(`.atlas-shortcut-hint[data-for='${textarea.id}']`))return;
    const hint=document.createElement('div');
    hint.className='atlas-shortcut-hint';
    hint.dataset.for=textarea.id;
    textarea.insertAdjacentElement('afterend',hint);
    const sync=()=>hint.textContent=copy(english());
    window.addEventListener('atlas:locale',sync);
    sync();
  };
  attach(document.getElementById('idea'),en=>en?'Ctrl/⌘ + Enter to analyze':'Ctrl/⌘ + Enter para analizar');
  attach(document.getElementById('answer'),en=>en?'Ctrl/⌘ + Enter to continue':'Ctrl/⌘ + Enter para continuar');
}

function bindActiveNavigation(){
  const links=[...document.querySelectorAll('.atlas-header-center a[href^="#"]')];
  if(!links.length)return;
  const byId=new Map(links.map(link=>[link.getAttribute('href').slice(1),link]));
  const sections=[...byId.keys()].map(id=>document.getElementById(id)).filter(Boolean);
  if(!sections.length)return;
  const observer=new IntersectionObserver(entries=>{
    const candidates=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
    if(!candidates.length)return;
    links.forEach(link=>link.classList.remove('is-active-section'));
    byId.get(candidates[0].target.id)?.classList.add('is-active-section');
  },{rootMargin:'-22% 0px -62% 0px',threshold:[0,.2,.45,.7]});
  sections.forEach(section=>observer.observe(section));
}

function bindScrollTop(){
  const button=document.createElement('button');
  button.type='button';
  button.className='atlas-scroll-top';
  button.setAttribute('aria-label',document.documentElement.lang==='en'?'Back to top':'Volver arriba');
  button.textContent='↑';
  document.body.appendChild(button);
  const syncLabel=()=>button.setAttribute('aria-label',document.documentElement.lang==='en'?'Back to top':'Volver arriba');
  window.addEventListener('atlas:locale',syncLabel);
  let pending=false;
  const sync=()=>{pending=false;button.classList.toggle('is-visible',window.scrollY>760);};
  window.addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(sync);}},{passive:true});
  button.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'}));
  sync();
}

function init(){
  installStyles();
  bindToast();
  bindFocusTrap();
  bindAutoGrow();
  addShortcutHints();
  bindActiveNavigation();
  bindScrollTop();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
