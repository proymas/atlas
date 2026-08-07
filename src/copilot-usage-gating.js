import { getLocale } from './i18n.js';

const nativeFetch=window.fetch.bind(window);
let wrapped=false;

function isCopilotRequest(input){
  const value=typeof input==='string'?input:input?.url||'';
  try{return new URL(value,location.origin).pathname==='/api/copilot';}catch{return value==='/api/copilot';}
}

function plan(){return window.AtlasEntitlements?.getPlan?.()==='pro'?'pro':'free';}
function token(){return window.AtlasAuth?.getSession?.()?.access_token||'';}
function limitAnswer(){return getLocale()==='en'?'You have used your 8 Free Copilot questions this month. Atlas Pro unlocks broad Copilot use.':'Has usado tus 8 consultas Free del Copiloto este mes. Atlas Pro desbloquea un uso amplio del Copiloto.';}

async function consume(){
  if(plan()==='pro')return{allowed:true,plan:'pro'};
  const accessToken=token();
  if(!accessToken)return{allowed:true,unmeteredGuest:true};
  const response=await nativeFetch('/api/projects?mode=consume-copilot',{
    method:'POST',
    headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},
    cache:'no-store',
    body:'{}'
  });
  const data=await response.json().catch(()=>({}));
  if(response.status===429||data?.error==='copilot_limit')return{allowed:false,limit:true,...data};
  if(!response.ok)throw new Error(data?.error||`copilot_usage_${response.status}`);
  return{allowed:true,...data};
}

export function initCopilotUsageGating(){
  if(wrapped)return;
  const previous=window.fetch.bind(window);
  window.fetch=async function(input,init){
    if(!isCopilotRequest(input))return previous(input,init);
    let usage;
    try{usage=await consume();}
    catch(error){console.warn('atlas_copilot_usage_check_failed',error);return previous(input,init);}
    if(!usage.allowed){
      window.dispatchEvent(new CustomEvent('atlas:copilot-limit',{detail:{used:usage.used||8,limit:usage.limit||8,period:usage.period||null}}));
      return new Response(JSON.stringify({status:'limit',answer:limitAnswer(),actions:[],grounded:true}),{status:200,headers:{'content-type':'application/json'}});
    }
    window.dispatchEvent(new CustomEvent('atlas:copilot-usage',{detail:usage}));
    return previous(input,init);
  };
  wrapped=true;
}

initCopilotUsageGating();
