const DEFAULT_PLAN='free';

const LIMITS={
  free:{
    activeProjects:1,
    evidencePerProject:5,
    activeExperimentsPerProject:1,
    reanalysesPerProject:1,
    copilotQueriesPerMonth:8,
    fullVersionCompare:false,
    fullHistory:false,
    premiumPdf:false,
  },
  pro:{
    activeProjects:Infinity,
    evidencePerProject:Infinity,
    activeExperimentsPerProject:Infinity,
    reanalysesPerProject:Infinity,
    copilotQueriesPerMonth:Infinity,
    fullVersionCompare:true,
    fullHistory:true,
    premiumPdf:true,
  },
};

let state={plan:DEFAULT_PLAN,status:'active',usage:{},ready:false,error:null};
let loading=null;

function session(){return window.AtlasAuth?.getSession?.()||null;}
function token(){return session()?.access_token||'';}
function normalizedPlan(value){return value==='pro'?'pro':'free';}
function notify(){window.dispatchEvent(new CustomEvent('atlas:entitlements',{detail:getEntitlements()}));}

export function getPlan(){return normalizedPlan(state.plan);}
export function isPro(){return getPlan()==='pro';}
export function getLimits(){return {...LIMITS[getPlan()]};}
export function getEntitlements(){return {...state,plan:getPlan(),limits:getLimits()};}
export function isEntitlementsReady(){return state.ready;}

export function can(feature,current=0){
  const limits=getLimits();
  if(feature in limits){
    const rule=limits[feature];
    if(typeof rule==='boolean')return rule;
    if(typeof rule==='number')return current<rule;
  }
  return true;
}

export async function refreshEntitlements(){
  if(loading)return loading;
  const accessToken=token();
  if(!accessToken){
    state={plan:DEFAULT_PLAN,status:'active',usage:{},ready:true,error:null};
    notify();
    return getEntitlements();
  }
  loading=(async()=>{
    try{
      const response=await fetch('/api/projects?mode=entitlements',{headers:{authorization:`Bearer ${accessToken}`},cache:'no-store'});
      if(!response.ok)throw new Error(`entitlements_${response.status}`);
      const data=await response.json();
      state={plan:normalizedPlan(data.plan),status:data.status||'active',usage:data.usage||{},ready:true,error:null};
    }catch(error){
      console.warn('atlas_entitlements_failed',error);
      state={plan:DEFAULT_PLAN,status:'active',usage:{},ready:true,error:error?.message||'entitlements_failed'};
    }finally{
      loading=null;
      notify();
    }
    return getEntitlements();
  })();
  return loading;
}

window.AtlasEntitlements={getPlan,isPro,getLimits,getEntitlements,can,refresh:refreshEntitlements};
window.addEventListener('atlas:auth-ready',refreshEntitlements);
window.addEventListener('atlas:auth',refreshEntitlements);
if(window.AtlasAuth?.getSession?.())refreshEntitlements();
