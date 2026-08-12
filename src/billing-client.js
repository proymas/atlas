import { getLocale } from './i18n.js';
import { getAttribution, getSessionId, track } from './tracking.js';

function session(){
  try{
    return window.AtlasAuth?.getSession?.()||JSON.parse(localStorage.getItem('atlas-auth-session-v1')||'null');
  }catch{
    return window.AtlasAuth?.getSession?.()||null;
  }
}
function token(){return session()?.access_token||'';}
function checkoutButton(){return document.querySelector('[data-pro-choose]');}
function setBillingState(state){
  const button=checkoutButton();
  if(button){
    if(!button.dataset.idleText)button.dataset.idleText=button.textContent||'';
    button.disabled=state==='loading';
    button.textContent=state==='loading'?(getLocale()==='en'?'Opening Stripe…':'Abriendo Stripe…'):button.dataset.idleText;
  }
  queueMicrotask(()=>document.getElementById('atlas-pro-soon')?.classList.add('hidden'));
  window.dispatchEvent(new CustomEvent('atlas:billing-state',{detail:{state}}));
}
async function call(body){const access=token();if(!access){window.AtlasAuth?.open?.();return null;}const response=await fetch('/api/billing',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${access}`},body:JSON.stringify(body)});const data=await response.json().catch(()=>({}));if(response.status===503&&data.error==='billing_disabled')return null;if(!response.ok)throw new Error(data.error||'billing_failed');return data;}
async function checkout(billing,source='pro_choose'){
  const attribution=getAttribution();
  track('commercial_intent',{billing,source});
  track('checkout_started',{billing,source});
  setBillingState('loading');
  try{
    const data=await call({billing,attribution,sessionId:getSessionId()});
    if(!data){setBillingState('idle');return;}
    if(data.url){track('checkout_redirected',{billing,source});location.assign(data.url);return;}
    setBillingState('idle');
  }catch(error){setBillingState('idle');throw error;}
}
window.addEventListener('atlas:pro-interest',event=>{checkout(event.detail?.billing==='monthly'?'monthly':'annual',event.detail?.source||'pro_choose').catch(error=>{console.error('atlas_checkout_failed',error);alert(getLocale()==='en'?'Checkout could not be opened. Please try again.':'No se pudo abrir el pago. Inténtalo de nuevo.');track('analysis_error',{errorCode:'billing_checkout_failed'});});});
window.addEventListener('atlas:upgrade-intent',event=>track('pricing_viewed',{source:event.detail?.source||'general'}));
document.addEventListener('click',event=>{if(event.target?.closest?.('.atlas-plan-badge'))track('pricing_viewed',{source:'plan_badge'});},true);
export async function openBillingPortal(){const data=await call({action:'portal'});if(data?.url)location.assign(data.url);}

function observePricing(){
  const button=checkoutButton();
  if(!button)return;
  if(!('IntersectionObserver' in window)){track('pricing_viewed',{source:'pro_offer'});return;}
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){
      track('pricing_viewed',{source:'pro_offer'});
      observer.disconnect();
    }
  },{threshold:0.25});
  observer.observe(button);
}

window.AtlasBilling={openPortal:openBillingPortal};
if(location.hash==='#atlas-pro')track('pricing_viewed',{source:'direct_hash'});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observePricing,{once:true});else observePricing();
