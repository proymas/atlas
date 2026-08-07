import { getLocale } from './i18n.js';

const SESSION_KEY='atlas-auth-session-v1';
const PKCE_VERIFIER_KEY='atlas-auth-code-verifier';
let config={enabled:false,url:'',anonKey:''};
let session=readSession();
let busy=false;

const copy=()=>getLocale()==='en'?{account:'Account',title:'Atlas account',subtitle:'Sign in to sync your projects securely across devices.',guest:'Guest mode',guestText:'Your projects remain stored only in this browser.',login:'Sign in',register:'Create account',recover:'Recover password',logout:'Sign out',email:'Email',password:'Password',name:'Name',submitLogin:'Sign in',submitRegister:'Create account',submitRecover:'Send recovery email',close:'Close',back:'Back',working:'Please wait…',notReady:'Accounts are being prepared. Guest mode remains fully available.',signedIn:'Signed in as',checkEmail:'Check your email to confirm the account.',recoverySent:'Recovery email sent.',invalid:'Check the information and try again.',passwordHint:'At least 8 characters.',continueGuest:'Continue as guest'}:{account:'Cuenta',title:'Cuenta Atlas',subtitle:'Inicia sesión para sincronizar tus proyectos de forma segura entre dispositivos.',guest:'Modo invitado',guestText:'Tus proyectos permanecen guardados únicamente en este navegador.',login:'Iniciar sesión',register:'Crear cuenta',recover:'Recuperar contraseña',logout:'Cerrar sesión',email:'Correo electrónico',password:'Contraseña',name:'Nombre',submitLogin:'Entrar',submitRegister:'Crear cuenta',submitRecover:'Enviar recuperación',close:'Cerrar',back:'Volver',working:'Espera…',notReady:'Las cuentas se están preparando. El modo invitado sigue disponible por completo.',signedIn:'Sesión iniciada como',checkEmail:'Revisa tu correo para confirmar la cuenta.',recoverySent:'Correo de recuperación enviado.',invalid:'Revisa los datos e inténtalo de nuevo.',passwordHint:'Mínimo 8 caracteres.',continueGuest:'Continuar como invitado'};
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;}}
function saveSession(value){session=value||null;if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY);window.dispatchEvent(new CustomEvent('atlas:auth',{detail:{session}}));}
function esc(value){return String(value??'').replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));}
function authHeaders(token=''){return{'content-type':'application/json','apikey':config.anonKey,'authorization':`Bearer ${token||config.anonKey}`};}
async function request(path,options={}){const response=await fetch(`${config.url}${path}`,{...options,headers:{...authHeaders(options.token),...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.msg||data?.error_description||data?.error||copy().invalid);return data;}
async function loadConfig(){try{const response=await fetch('/api/auth-config',{cache:'no-store'});config=await response.json();}catch{config={enabled:false,url:'',anonKey:''};}renderButton();}
async function refreshSession(){if(!config.enabled||!session?.refresh_token)return;try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});saveSession(data);}catch{saveSession(null);}}
function base64Url(bytes){let binary='';bytes.forEach(byte=>binary+=String.fromCharCode(byte));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function createVerifier(){const bytes=new Uint8Array(48);crypto.getRandomValues(bytes);return base64Url(bytes);}
async function createChallenge(verifier){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));return base64Url(new Uint8Array(digest));}
function cleanAuthUrl(){history.replaceState({},document.title,location.pathname);}
async function consumeAuthCallback(){
  if(!config.enabled)return false;
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const query=new URLSearchParams(location.search);
  const accessToken=hash.get('access_token');
  const refreshToken=hash.get('refresh_token');
  const expiresIn=Number(hash.get('expires_in')||0);
  const tokenType=hash.get('token_type')||'bearer';
  if(accessToken&&refreshToken){
    try{
      const user=await request('/auth/v1/user',{method:'GET',token:accessToken});
      saveSession({access_token:accessToken,refresh_token:refreshToken,expires_in:expiresIn,token_type:tokenType,user});
      cleanAuthUrl();
      return true;
    }catch{}
  }
  const code=query.get('code');
  if(code){
    try{
      const verifier=localStorage.getItem(PKCE_VERIFIER_KEY)||sessionStorage.getItem(PKCE_VERIFIER_KEY);
      const body=verifier?{auth_code:code,code_verifier:verifier}:{auth_code:code};
      const result=await request('/auth/v1/token?grant_type=pkce',{method:'POST',body:JSON.stringify(body)});
      localStorage.removeItem(PKCE_VERIFIER_KEY);
      sessionStorage.removeItem(PKCE_VERIFIER_KEY);
      saveSession(result);
      cleanAuthUrl();
      return true;
    }catch{}
    // Supabase's hosted confirmation can return a standard authorization code.
    // Exchange it as an authorization_code when PKCE state is unavailable (e.g. link opened in another browser context).
    try{
      const result=await request('/auth/v1/token?grant_type=authorization_code',{method:'POST',body:JSON.stringify({code})});
      saveSession(result);
      cleanAuthUrl();
      return true;
    }catch{}
  }
  return false;
}
function styles(){if(document.getElementById('atlas-auth-styles'))return;const style=document.createElement('style');style.id='atlas-auth-styles';style.textContent=`.atlas-account-button{border:1px solid var(--line);border-radius:999px;background:rgba(5,13,25,.65);color:var(--text);padding:9px 13px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.atlas-auth-modal{position:fixed;inset:0;z-index:1500;display:grid;place-items:center;padding:16px;background:rgba(2,7,15,.84);backdrop-filter:blur(14px)}.atlas-auth-modal.hidden{display:none}.atlas-auth-panel{width:min(460px,100%);border:1px solid var(--line);border-radius:24px;background:linear-gradient(150deg,#0f1d33,#071321);box-shadow:0 40px 120px rgba(0,0,0,.62);padding:22px}.atlas-auth-head{display:flex;justify-content:space-between;gap:14px}.atlas-auth-head h2{margin:4px 0 6px}.atlas-auth-head p{margin:0;color:var(--muted)}.atlas-auth-close,.atlas-auth-link,.atlas-auth-submit{border:1px solid var(--line);border-radius:11px;background:#0d1d31;color:var(--text);padding:10px 12px;cursor:pointer}.atlas-auth-body{display:grid;gap:12px;margin-top:18px}.atlas-auth-card{border:1px solid var(--line);border-radius:15px;background:#081523;padding:15px}.atlas-auth-card p{color:var(--muted);margin:6px 0 0}.atlas-auth-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.atlas-auth-form{display:grid;gap:11px}.atlas-auth-form label{display:grid;gap:6px;color:var(--muted);font-size:12px}.atlas-auth-form input{width:100%;border:1px solid var(--line);border-radius:11px;background:#06111e;color:var(--text);padding:11px;font:inherit}.atlas-auth-submit{border-color:rgba(91,201,255,.5);background:rgba(91,201,255,.12);font-weight:800}.atlas-auth-message{min-height:18px;color:var(--muted);font-size:12px}.atlas-auth-message.error{color:#ff8f8f}@media(max-width:700px){.atlas-account-button{padding:8px 10px;font-size:11px}.atlas-auth-panel{padding:17px;border-radius:18px}.atlas-auth-actions{grid-template-columns:1fr}}`;document.head.appendChild(style);}
function modal(){let root=document.getElementById('atlas-auth-modal');if(root)return root;styles();root=document.createElement('div');root.id='atlas-auth-modal';root.className='atlas-auth-modal hidden';root.innerHTML='<section class="atlas-auth-panel" role="dialog" aria-modal="true"><header class="atlas-auth-head"><div><p class="eyebrow">ATLAS</p><h2 data-auth-title></h2><p data-auth-subtitle></p></div><button class="atlas-auth-close" data-auth-close type="button">×</button></header><div class="atlas-auth-body" data-auth-body></div></section>';document.body.appendChild(root);root.addEventListener('click',event=>{if(event.target===root||event.target.closest('[data-auth-close]'))close();});return root;}
function renderButton(){styles();let button=document.querySelector('[data-atlas-account]');if(!button){button=document.createElement('button');button.type='button';button.className='atlas-account-button';button.dataset.atlasAccount='';button.addEventListener('click',open);const host=document.querySelector('.nav-actions')||document.querySelector('.nav');host?.appendChild(button);}button.textContent=session?.user?.email?String(session.user.email).split('@')[0]:copy().account;}
function open(){const root=modal();renderHome();root.classList.remove('hidden');document.body.style.overflow='hidden';}
function close(){modal().classList.add('hidden');document.body.style.overflow='';}
function shell(){const c=copy(),root=modal();root.querySelector('[data-auth-title]').textContent=c.title;root.querySelector('[data-auth-subtitle]').textContent=c.subtitle;return root.querySelector('[data-auth-body]');}
function renderHome(){const c=copy(),body=shell();if(session?.user){body.innerHTML=`<div class="atlas-auth-card"><strong>${esc(c.signedIn)}</strong><p>${esc(session.user.email||'')}</p></div><button class="atlas-auth-submit" data-auth-logout>${esc(c.logout)}</button>`;body.querySelector('[data-auth-logout]').addEventListener('click',async()=>{busy=true;try{if(config.enabled&&session?.access_token)await request('/auth/v1/logout',{method:'POST',token:session.access_token});}catch{}saveSession(null);busy=false;renderButton();renderHome();});return;}body.innerHTML=`<div class="atlas-auth-card"><strong>${esc(c.guest)}</strong><p>${esc(config.enabled?c.guestText:c.notReady)}</p></div>${config.enabled?`<div class="atlas-auth-actions"><button class="atlas-auth-link" data-mode="login">${esc(c.login)}</button><button class="atlas-auth-link" data-mode="register">${esc(c.register)}</button></div><button class="atlas-auth-link" data-mode="recover">${esc(c.recover)}</button>`:''}<button class="atlas-auth-submit" data-auth-close>${esc(c.continueGuest)}</button>`;body.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>renderForm(button.dataset.mode)));}
function renderForm(mode){const c=copy(),body=shell();const register=mode==='register',recover=mode==='recover';body.innerHTML=`<button class="atlas-auth-link" data-back type="button">← ${esc(c.back)}</button><form class="atlas-auth-form" data-auth-form>${register?`<label>${esc(c.name)}<input name="name" autocomplete="name" maxlength="80"></label>`:''}<label>${esc(c.email)}<input name="email" type="email" autocomplete="email" required></label>${recover?'':`<label>${esc(c.password)}<input name="password" type="password" minlength="8" autocomplete="${register?'new-password':'current-password'}" required><small>${esc(c.passwordHint)}</small></label>`}<div class="atlas-auth-message" data-auth-message></div><button class="atlas-auth-submit" type="submit">${esc(recover?c.submitRecover:register?c.submitRegister:c.submitLogin)}</button></form>`;body.querySelector('[data-back]').addEventListener('click',renderHome);body.querySelector('[data-auth-form]').addEventListener('submit',event=>submit(event,mode));}
async function submit(event,mode){event.preventDefault();if(busy)return;busy=true;const c=copy(),form=event.currentTarget,message=form.querySelector('[data-auth-message]'),button=form.querySelector('button[type="submit"]'),data=new FormData(form),email=String(data.get('email')||'').trim(),password=String(data.get('password')||''),name=String(data.get('name')||'').trim();button.disabled=true;button.textContent=c.working;message.className='atlas-auth-message';message.textContent='';try{if(mode==='register'){const verifier=createVerifier();const challenge=await createChallenge(verifier);localStorage.setItem(PKCE_VERIFIER_KEY,verifier);sessionStorage.setItem(PKCE_VERIFIER_KEY,verifier);const redirectTo=`${location.origin}${location.pathname}`;const result=await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password,data:{name},email_redirect_to:redirectTo,code_challenge:challenge,code_challenge_method:'s256'})});if(result.access_token){localStorage.removeItem(PKCE_VERIFIER_KEY);sessionStorage.removeItem(PKCE_VERIFIER_KEY);saveSession(result);renderButton();renderHome();}else message.textContent=c.checkEmail;}else if(mode==='recover'){await request('/auth/v1/recover',{method:'POST',body:JSON.stringify({email,redirect_to:location.origin})});message.textContent=c.recoverySent;}else{const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});saveSession(result);renderButton();renderHome();}}catch(error){if(mode==='register'){localStorage.removeItem(PKCE_VERIFIER_KEY);sessionStorage.removeItem(PKCE_VERIFIER_KEY);}message.className='atlas-auth-message error';message.textContent=error.message||c.invalid;}finally{busy=false;button.disabled=false;if(document.body.contains(button))button.textContent=mode==='recover'?c.submitRecover:mode==='register'?c.submitRegister:c.submitLogin;}}
window.AtlasAuth={getSession:()=>session,getConfig:()=>({...config}),isAuthenticated:()=>Boolean(session?.access_token),open};
window.addEventListener('atlas:locale',()=>{renderButton();if(!modal().classList.contains('hidden'))renderHome();});
loadConfig().then(async()=>{const consumed=await consumeAuthCallback();if(!consumed)await refreshSession();}).finally(()=>{renderButton();window.dispatchEvent(new CustomEvent('atlas:auth-ready',{detail:{session}}));});