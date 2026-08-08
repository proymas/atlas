const STYLE_ID='atlas-confirm-styles';
let active=null;

function english(){return document.documentElement.lang==='en';}

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .atlas-confirm-overlay{position:fixed;inset:0;z-index:2200;display:grid;place-items:center;padding:18px;background:rgba(2,7,15,.78);backdrop-filter:blur(12px);opacity:0;transition:opacity 150ms cubic-bezier(.22,.8,.24,1)}
    .atlas-confirm-overlay.is-open{opacity:1}
    .atlas-confirm-panel{width:min(440px,100%);border:1px solid rgba(125,165,220,.22);border-radius:22px;background:linear-gradient(150deg,#0f1d33,#071321);box-shadow:0 32px 100px rgba(0,0,0,.58);padding:22px;translate:0 9px;transition:translate 170ms cubic-bezier(.22,.8,.24,1)}
    .atlas-confirm-overlay.is-open .atlas-confirm-panel{translate:0 0}
    .atlas-confirm-icon{display:grid;place-items:center;width:38px;height:38px;margin-bottom:15px;border-radius:13px;border:1px solid rgba(255,116,116,.28);background:rgba(170,38,48,.12);color:#ff9b9b;font-size:17px;font-weight:900}
    .atlas-confirm-panel h3{margin:0 0 8px;font-size:22px;line-height:1.2;color:var(--text,#f5fbff)}
    .atlas-confirm-panel p{margin:0;color:var(--muted,#9aacc2);line-height:1.55;font-size:14px}
    .atlas-confirm-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:22px}
    .atlas-confirm-actions button{min-height:42px;padding:9px 14px;border-radius:12px;font:inherit;font-weight:800;cursor:pointer}
    .atlas-confirm-cancel{border:1px solid var(--line,rgba(150,170,200,.2));background:#0b1a2c;color:var(--text,#f5fbff)}
    .atlas-confirm-danger{border:1px solid rgba(255,116,116,.38);background:rgba(168,38,48,.16);color:#ffabab}
    .atlas-confirm-danger:hover{background:rgba(168,38,48,.24)}
    @media(max-width:520px){.atlas-confirm-overlay{padding:14px}.atlas-confirm-panel{padding:19px;border-radius:19px}.atlas-confirm-actions{display:grid;grid-template-columns:1fr 1fr}.atlas-confirm-actions button{width:100%}}
    @media(prefers-reduced-motion:reduce){.atlas-confirm-overlay,.atlas-confirm-panel{transition:none!important;translate:none!important}}
  `;
  document.head.appendChild(style);
}

function close(result=false){
  if(!active)return;
  const current=active;
  active=null;
  current.root.classList.remove('is-open');
  document.documentElement.style.overflow=current.previousOverflow;
  setTimeout(()=>{
    current.root.remove();
    if(current.trigger?.isConnected)current.trigger.focus({preventScroll:true});
    current.resolve(result);
  },160);
}

export function ask(options={},trigger=null){
  installStyles();
  if(active)close(false);
  return new Promise(resolve=>{
    const root=document.createElement('div');
    root.className='atlas-confirm-overlay';
    root.innerHTML=`<section class="atlas-confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="atlas-confirm-title" aria-describedby="atlas-confirm-message"><div class="atlas-confirm-icon" aria-hidden="true">!</div><h3 id="atlas-confirm-title"></h3><p id="atlas-confirm-message"></p><div class="atlas-confirm-actions"><button type="button" class="atlas-confirm-cancel"></button><button type="button" class="atlas-confirm-danger"></button></div></section>`;
    root.querySelector('#atlas-confirm-title').textContent=options.title||'';
    root.querySelector('#atlas-confirm-message').textContent=options.message||'';
    const cancel=root.querySelector('.atlas-confirm-cancel');
    const danger=root.querySelector('.atlas-confirm-danger');
    cancel.textContent=options.cancel||(english()?'Cancel':'Cancelar');
    danger.textContent=options.confirm||(english()?'Delete':'Eliminar');
    const previousOverflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';
    document.body.appendChild(root);
    active={root,resolve,trigger,previousOverflow};
    cancel.addEventListener('click',()=>close(false));
    danger.addEventListener('click',()=>close(true));
    root.addEventListener('click',event=>{if(event.target===root)close(false);});
    requestAnimationFrame(()=>{root.classList.add('is-open');cancel.focus({preventScroll:true});});
  });
}

function onKeydown(event){
  if(!active)return;
  if(event.key==='Escape'){event.preventDefault();close(false);return;}
  if(event.key!=='Tab')return;
  const buttons=[...active.root.querySelectorAll('button:not(:disabled)')];
  if(!buttons.length)return;
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}

document.addEventListener('keydown',onKeydown,true);
window.AtlasConfirm={ask};
