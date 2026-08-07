import { getLocale } from './i18n.js';

const SESSION_KEY='atlas-auth-session-v1';
let deleting=false;

const text=()=>getLocale()==='en'?{
  button:'Delete account',
  title:'Delete Atlas account?',
  warning:'This permanently deletes your account and cannot be undone. Your cloud account will be removed.',
  confirm:'Delete permanently',
  cancel:'Cancel',
  phrase:'DELETE',
  prompt:'Type DELETE to confirm permanent account deletion.',
  failed:'Atlas could not delete your account. Please try again.'
}:{
  button:'Eliminar cuenta',
  title:'¿Eliminar tu cuenta de Atlas?',
  warning:'Esto elimina tu cuenta de forma permanente y no se puede deshacer. Tu cuenta cloud será eliminada.',
  confirm:'Eliminar permanentemente',
  cancel:'Cancelar',
  phrase:'ELIMINAR',
  prompt:'Escribe ELIMINAR para confirmar la eliminación permanente de la cuenta.',
  failed:'Atlas no pudo eliminar tu cuenta. Inténtalo de nuevo.'
};

function addStyles(){
  if(document.getElementById('atlas-delete-account-styles'))return;
  const style=document.createElement('style');
  style.id='atlas-delete-account-styles';
  style.textContent=`.atlas-delete-account{margin-top:2px;border:1px solid rgba(255,110,110,.42);border-radius:11px;background:rgba(150,25,35,.12);color:#ff9a9a;padding:10px 12px;font:inherit;font-weight:800;cursor:pointer}.atlas-delete-account:hover{background:rgba(150,25,35,.2)}.atlas-delete-confirm{position:fixed;inset:0;z-index:1700;display:grid;place-items:center;padding:16px;background:rgba(2,7,15,.9);backdrop-filter:blur(14px)}.atlas-delete-confirm-panel{width:min(430px,100%);border:1px solid rgba(255,110,110,.35);border-radius:20px;background:#0b1727;padding:20px;box-shadow:0 35px 100px rgba(0,0,0,.65)}.atlas-delete-confirm-panel h3{margin:0 0 10px}.atlas-delete-confirm-panel p{color:var(--muted);line-height:1.55}.atlas-delete-confirm-panel input{width:100%;box-sizing:border-box;margin:8px 0 14px;border:1px solid var(--line);border-radius:11px;background:#06111e;color:var(--text);padding:11px;font:inherit}.atlas-delete-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.atlas-delete-actions button{border:1px solid var(--line);border-radius:11px;background:#0d1d31;color:var(--text);padding:10px 12px;font:inherit;cursor:pointer}.atlas-delete-actions .danger{border-color:rgba(255,110,110,.45);color:#ff9a9a}.atlas-delete-actions .danger:disabled{opacity:.45;cursor:not-allowed}`;
  document.head.appendChild(style);
}

function closeConfirm(){document.getElementById('atlas-delete-confirm')?.remove();}

function openConfirm(){
  if(deleting)return;
  const c=text();
  closeConfirm();
  const root=document.createElement('div');
  root.id='atlas-delete-confirm';
  root.className='atlas-delete-confirm';
  root.innerHTML=`<section class="atlas-delete-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="atlas-delete-title"><h3 id="atlas-delete-title">${c.title}</h3><p>${c.warning}</p><p><strong>${c.prompt}</strong></p><input data-delete-phrase autocomplete="off" autocapitalize="characters"><div class="atlas-delete-actions"><button type="button" data-delete-cancel>${c.cancel}</button><button type="button" class="danger" data-delete-confirm disabled>${c.confirm}</button></div></section>`;
  document.body.appendChild(root);
  const input=root.querySelector('[data-delete-phrase]');
  const confirm=root.querySelector('[data-delete-confirm]');
  input.addEventListener('input',()=>{confirm.disabled=input.value.trim().toUpperCase()!==c.phrase;});
  root.querySelector('[data-delete-cancel]').addEventListener('click',closeConfirm);
  root.addEventListener('click',event=>{if(event.target===root)closeConfirm();});
  confirm.addEventListener('click',deleteAccount);
  input.focus();
}

async function deleteAccount(){
  if(deleting)return;
  const session=window.AtlasAuth?.getSession?.();
  const config=window.AtlasAuth?.getConfig?.();
  if(!session?.access_token||!config?.url)return;
  deleting=true;
  const button=document.querySelector('[data-delete-confirm]');
  if(button)button.disabled=true;
  try{
    const response=await fetch(`${config.url}/functions/v1/delete-account`,{method:'POST',headers:{'content-type':'application/json','apikey':config.anonKey,'authorization':`Bearer ${session.access_token}`}});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result?.error||text().failed);
    localStorage.removeItem(SESSION_KEY);
    closeConfirm();
    location.replace(`${location.origin}${location.pathname}`);
  }catch(error){
    alert(error?.message||text().failed);
    deleting=false;
    if(button)button.disabled=false;
  }
}

function inject(){
  addStyles();
  const session=window.AtlasAuth?.getSession?.();
  const body=document.querySelector('#atlas-auth-modal [data-auth-body]');
  if(!body||!session?.user)return;
  if(body.querySelector('[data-delete-account]'))return;
  const button=document.createElement('button');
  button.type='button';
  button.className='atlas-delete-account';
  button.dataset.deleteAccount='';
  button.textContent=text().button;
  button.addEventListener('click',openConfirm);
  body.appendChild(button);
}

const observer=new MutationObserver(()=>inject());
function init(){addStyles();observer.observe(document.body,{childList:true,subtree:true});inject();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('atlas:auth-ready',inject);
window.addEventListener('atlas:auth',()=>setTimeout(inject,0));
window.addEventListener('atlas:locale',()=>setTimeout(inject,0));
