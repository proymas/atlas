const STYLE_ID='atlas-confirm-styles';
const CONFIRMED='atlasConfirmed';
let active=null;

function english(){return document.documentElement.lang==='en';}

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .atlas-confirm-overlay{position:fixed;inset:0;z-index:2200;display:grid;place-items:center;padding:18px;background:rgba(2,7,15,.78);backdrop-filter:blur(12px);opacity:0;transition:opacity 150ms cubic-bezier(.22,.8,.24,1)}
    .atlas-confirm-overlay.is-open{opacity:1}
    .atlas-confirm-panel{width:min(440px,100%);border:1px solid rgba(125,165,220,.22);border-radius:22px;background:linear-gradient(150deg,#0f1d33,#071321);box-shadow:0 32px 100px rgba(0,0,0,.58);padding:22px;translate:0 9px;scale:.99;transition:translate 170ms cubic-bezier(.22,.8,.24,1),scale 170ms cubic-bezier(.22,.8,.24,1)}
    .atlas-confirm-overlay.is-open .atlas-confirm-panel{translate:0 0;scale:1}
    .atlas-confirm-icon{display:grid;place-items:center;width:38px;height:38px;margin-bottom:15px;border-radius:13px;border:1px solid rgba(255,116,116,.28);background:rgba(170,38,48,.12);color:#ff9b9b;font-size:17px;font-weight:900}
    .atlas-confirm-panel h3{margin:0 0 8px;font-size:22px;line-height:1.2;color:var(--text,#f5fbff)}
    .atlas-confirm-panel p{margin:0;color:var(--muted,#9aacc2);line-height:1.55;font-size:14px}
    .atlas-confirm-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:22px}
    .atlas-confirm-actions button{min-height:42px;padding:9px 14px;border-radius:12px;font:inherit;font-weight:800;cursor:pointer}
    .atlas-confirm-cancel{border:1px solid var(--line,rgba(150,170,200,.2));background:#0b1a2c;color:var(--text,#f5fbff)}
    .atlas-confirm-danger{border:1px solid rgba(255,116,116,.38);background:rgba(168,38,48,.16);color:#ffabab}
    .atlas-confirm-danger:hover{background:rgba(168,38,48,.24)}
    @media(max-width:520px){.atlas-confirm-overlay{padding:14px}.atlas-confirm-panel{padding:19px;border-radius:19px}.atlas-confirm-actions{display:grid;grid-template-columns:1fr 1fr}.atlas-confirm-actions button{width:100%}}
    @media(prefers-reduced-motion:reduce){.atlas-confirm-overlay,.atlas-confirm-panel{transition:none!important;translate:none!important;scale:1!important}}
  `;
  document.head.appendChild(style);
}

function copyFor(button){
  const en=english();
  const text=(button.textContent||'').trim().toLowerCase();
  if(button.matches('[data-copilot-clear]')||text.includes('borrar chat')||text.includes('clear chat')){
    return en
      ? {title:'Clear this conversation?',message:'The Copilot conversation for this project will be removed. This action cannot be undone.',confirm:'Clear chat'}
      : {title:'¿Borrar esta conversación?',message:'Se eliminará la conversación del Copiloto de este proyecto. Esta acción no se puede deshacer.',confirm:'Borrar chat'};
  }
  if(button.closest('.workspace-evidence-card')||text.includes('evidencia')||text.includes('evidence')){
    return en
      ? {title:'Delete this evidence?',message:'This evidence will be removed from the project. This action cannot be undone.',confirm:'Delete evidence'}
      : {title:'¿Eliminar esta evidencia?',message:'Esta evidencia se eliminará del proyecto. Esta acción no se puede deshacer.',confirm:'Eliminar evidencia'};
  }
  if(button.closest('.workspace-card')||button.matches('[data-action="delete"]')){
    return en
      ? {title:'Delete this project?',message:'The project and its local history will be removed. This action cannot be undone.',confirm:'Delete project'}
      : {title:'¿Eliminar este proyecto?',message:'Se eliminarán el proyecto y su historial local. Esta acción no se puede deshacer.',confirm:'Eliminar proyecto'};
  }
  return en
    ? {title:'Delete this item?',message:'This action cannot be undone.',confirm:'Delete'}
    : {title:'¿Eliminar este elemento?',message:'Esta acción no se puede deshacer.',confirm:'Eliminar'};
}

function close(result=false){
  if(!active)return;
  const {root,resolve,trigger,previousOverflow}=active;
  active=null;
  root.classList.remove('is-open');
  document.documentElement.style.overflow=previousOverflow;
  setTimeout(()=>{
    root.remove();
    if(trigger?.isConnected)trigger.focus({preventScroll:true});
    resolve(result);
  },160);
}

function ask(options={},trigger=null){
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

function destructiveButton(target){
  const button=target instanceof Element?target.closest('button'):null;
  if(!(button instanceof HTMLButtonElement)||button.disabled)return null;
  if(button.matches('[data-delete-account],[data-delete-confirm],[data-delete-cancel]')||button.closest('.atlas-delete-confirm'))return null;
  if(button.matches('[data-copilot-clear],[data-action="delete"]'))return button;
  const text=(button.textContent||'').trim().toLowerCase();
  if(['eliminar','delete','borrar chat','clear chat','eliminar evidencia','delete evidence','eliminar proyecto','delete project'].includes(text))return button;
  if(button.closest('.workspace-evidence-actions')&&(text.includes('eliminar')||text.includes('delete')))return button;
  return null;
}

function runApprovedClick(button){
  if(!(button instanceof HTMLButtonElement)||!button.isConnected)return;
  button.dataset[CONFIRMED]='1';
  const nativeConfirm=window.confirm;
  try{
    // Existing Workspace/Copilot handlers still contain synchronous confirm().
    // The Atlas dialog has already obtained consent, so allow that exact handler
    // to continue once without presenting a second native browser dialog.
    window.confirm=()=>true;
    button.click();
  }finally{
    window.confirm=nativeConfirm;
    delete button.dataset[CONFIRMED];
  }
}

function trapKeys(event){
  if(!active)return;
  if(event.key==='Escape'){
    event.preventDefault();
    close(false);
    return;
  }
  if(event.key!=='Tab')return;
  const buttons=[...active.root.querySelectorAll('button:not(:disabled)')];
  if(!buttons.length)return;
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}

function init(){
  installStyles();
  document.addEventListener('keydown',trapKeys,true);
  document.addEventListener('click',async event=>{
    const button=destructiveButton(event.target);
    if(!button)return;
    if(button.dataset[CONFIRMED]==='1')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const accepted=await ask(copyFor(button),button);
    if(!accepted)return;
    runApprovedClick(button);
  },true);
  window.AtlasConfirm={ask};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
