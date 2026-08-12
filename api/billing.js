import crypto from 'node:crypto';
import { put } from '@vercel/blob';

const STRIPE='https://api.stripe.com/v1';
const LIVE_ORIGIN='https://atlas-beta-2.vercel.app';
const LIVE_PRICES={monthly:'price_1U2825ENQtHnWsv9hHUAuODi',annual:'price_1U283aENQtHnWsv9mUQrXGy8'};
const WEBHOOK_TOLERANCE_SECONDS=300;
export const config={api:{bodyParser:false}};

const enabled=()=>process.env.ATLAS_BILLING_ENABLED==='true';
const billingMode=()=>String(process.env.ATLAS_BILLING_MODE||'live').trim().toLowerCase()==='test'?'test':'live';
const isTestMode=()=>billingMode()==='test';
const supabaseUrl=()=>String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://nnmztjqmnlvenvjsuqxc.supabase.co').trim().replace(/\/$/,'');
const anonKey=()=>String(process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'').trim();
const serviceKey=()=>String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
const metadataKey=cfg=>cfg.mode==='test'?'atlas_test_billing':'atlas_billing';

function appOrigin(cfg){
  const configured=String(process.env.ATLAS_APP_ORIGIN||'').trim().replace(/\/$/,'');
  if(configured)return configured;
  if(cfg.mode==='live')return LIVE_ORIGIN;
  const vercel=String(process.env.VERCEL_URL||'').trim().replace(/\/$/,'');
  return vercel?`https://${vercel}`:LIVE_ORIGIN;
}

function stripeConfig(){
  if(isTestMode()){
    const prices={monthly:String(process.env.STRIPE_TEST_PRICE_MONTHLY||'').trim(),annual:String(process.env.STRIPE_TEST_PRICE_ANNUAL||'').trim()};
    const secret=String(process.env.STRIPE_TEST_SECRET_KEY||'').trim();
    const webhookSecret=String(process.env.STRIPE_TEST_WEBHOOK_SECRET||'').trim();
    if(!secret||(!secret.startsWith('sk_test_')&&!secret.startsWith('rk_test_')))throw new Error('stripe_test_key_not_configured');
    if(!prices.monthly||!prices.annual)throw new Error('stripe_test_prices_not_configured');
    return {mode:'test',secret,webhookSecret,prices};
  }
  const secret=String(process.env.STRIPE_SECRET_KEY||'').trim();
  const webhookSecret=String(process.env.STRIPE_WEBHOOK_SECRET||'').trim();
  if(!secret||(!secret.startsWith('sk_live_')&&!secret.startsWith('rk_live_')))throw new Error('stripe_live_key_not_configured');
  if(!webhookSecret)throw new Error('stripe_live_webhook_not_configured');
  return {mode:'live',secret,webhookSecret,prices:LIVE_PRICES};
}

async function raw(req){const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));return Buffer.concat(chunks);}
function bearer(req){const v=String(req.headers.authorization||'');return v.toLowerCase().startsWith('bearer ')?v.slice(7).trim():'';}
function safeToken(value){const token=String(value||'').trim().toLowerCase();return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(token)?token:'';}
function safeSessionId(value){const id=String(value||'').trim();return /^[a-zA-Z0-9_-]{8,80}$/.test(id)?id:'';}
function cleanAttribution(value){
  const partner=safeToken(value?.partner||value?.ref);
  const campaign=safeToken(value?.campaign);
  return {partner,ref:partner,campaign};
}

async function persistCommercialEvent(name,{sessionId='',partner='',campaign='',billing='',source='stripe'}={}){
  const event={
    id:crypto.randomUUID(),
    name,
    sessionId:safeSessionId(sessionId)||`stripe_${crypto.randomUUID().replaceAll('-','').slice(0,24)}`,
    version:'server',
    locale:'unknown',
    country:'unknown',
    createdAt:new Date().toISOString(),
    data:{source,billing,partner,ref:partner,campaign}
  };
  console.log(JSON.stringify({type:'atlas_product_event',...event}));
  if(!process.env.BLOB_READ_WRITE_TOKEN)return;
  const day=event.createdAt.slice(0,10);
  const pathname=`analytics/events/${day}/${event.createdAt.replace(/[:.]/g,'-')}-${event.id}.json`;
  await put(pathname,JSON.stringify(event),{access:'private',contentType:'application/json',addRandomSuffix:false});
}

async function user(token){
  const key=anonKey(),url=supabaseUrl();
  if(!url||!key||!token)return null;
  const r=await fetch(`${url}/auth/v1/user`,{headers:{authorization:`Bearer ${token}`,apikey:key}});
  return r.ok?r.json():null;
}

async function stripe(path,body,cfg){
  const r=await fetch(`${STRIPE}${path}`,{method:'POST',headers:{authorization:`Bearer ${cfg.secret}`,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.error?.message||'stripe_failed');
  return d;
}

async function stripeGet(path,cfg){
  const r=await fetch(`${STRIPE}${path}`,{headers:{authorization:`Bearer ${cfg.secret}`}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.error?.message||'stripe_failed');
  return d;
}

async function adminUser(userId){
  const key=serviceKey(),url=supabaseUrl();
  if(!key||!url)throw new Error('supabase_service_not_configured');
  const r=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{headers:{authorization:`Bearer ${key}`,apikey:key}});
  if(!r.ok)throw new Error(`supabase_admin_user_${r.status}`);
  return r.json();
}

async function authPlan(userId,cfg){const u=await adminUser(userId);return u?.app_metadata?.[metadataKey(cfg)]||null;}

async function patchAuthPlan(userId,data,cfg){
  const key=serviceKey(),url=supabaseUrl();
  if(!key||!url)throw new Error('supabase_service_not_configured');
  const current=await adminUser(userId);
  const k=metadataKey(cfg);
  const appMetadata={...(current?.app_metadata||{}),[k]:{...data,updated_at:new Date().toISOString()}};
  const r=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'PUT',headers:{authorization:`Bearer ${key}`,apikey:key,'content-type':'application/json'},body:JSON.stringify({app_metadata:appMetadata})});
  if(!r.ok){
    let detail='';
    try{detail=(await r.text()).slice(0,300);}catch{}
    console.error('supabase_billing_metadata_update_failed',{mode:cfg.mode,status:r.status,urlHost:new URL(url).host,detail});
    throw new Error(`billing_metadata_update_failed_${r.status}`);
  }
}

async function plan(userId,cfg){
  const saved=await authPlan(userId,cfg);
  if(saved?.stripe_customer_id)return saved;
  const list=await stripeGet('/subscriptions?status=all&limit=100',cfg);
  const sub=(list.data||[]).find(s=>s?.metadata?.atlas_user_id===userId&&String(s?.metadata?.atlas_stripe_mode||cfg.mode)===cfg.mode);
  return sub?{stripe_customer_id:sub.customer||null,stripe_subscription_id:sub.id||null}:saved;
}

function parseStripeSignature(header){
  const parts=String(header||'').split(',').map(part=>part.trim()).filter(Boolean);
  const timestamp=Number(parts.find(part=>part.startsWith('t='))?.slice(2)||0);
  const signatures=parts.filter(part=>part.startsWith('v1=')).map(part=>part.slice(3)).filter(Boolean);
  return {timestamp,signatures};
}

function verify(payload,header,secret){
  if(!secret||!header)return false;
  const {timestamp,signatures}=parseStripeSignature(header);
  if(!timestamp||!signatures.length)return false;
  const age=Math.abs(Math.floor(Date.now()/1000)-timestamp);
  if(age>WEBHOOK_TOLERANCE_SECONDS)return false;
  const signed=`${timestamp}.${payload.toString('utf8')}`;
  const expected=crypto.createHmac('sha256',secret).update(signed).digest('hex');
  return signatures.some(given=>{
    if(expected.length!==given.length)return false;
    try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(given));}catch{return false;}
  });
}

async function webhook(req,res,payload,cfg){
  if(!verify(payload,String(req.headers['stripe-signature']||''),cfg.webhookSecret))return res.status(400).json({error:'invalid_signature'});
  const event=JSON.parse(payload.toString('utf8'));
  if(Boolean(event.livemode)!==(cfg.mode==='live'))return res.status(400).json({error:'stripe_mode_mismatch'});
  const o=event.data?.object||{};

  if(event.type==='checkout.session.completed'&&o.payment_status==='paid'){
    await persistCommercialEvent('payment',{
      sessionId:o.metadata?.atlas_session_id,
      partner:o.metadata?.atlas_partner,
      campaign:o.metadata?.atlas_campaign,
      billing:o.metadata?.atlas_billing,
      source:cfg.mode==='test'?'stripe_test':'stripe'
    });
  }

  if(event.type.startsWith('customer.subscription.')&&o.metadata?.atlas_user_id){
    const interval=Object.fromEntries(Object.entries(cfg.prices).map(([k,v])=>[v,k]));
    const price=o.items?.data?.[0]?.price?.id||null;
    const pro=['active','trialing'].includes(o.status);
    await patchAuthPlan(o.metadata.atlas_user_id,{plan:pro?'pro':'free',status:pro?'active':'inactive',stripe_status:o.status||'unknown',source:cfg.mode==='test'?'stripe_test':'stripe',stripe_customer_id:o.customer||null,stripe_subscription_id:o.id||null,stripe_price_id:price,billing_interval:interval[price]||null,current_period_end:o.current_period_end?new Date(o.current_period_end*1000).toISOString():null,cancel_at_period_end:Boolean(o.cancel_at_period_end),partner:o.metadata?.atlas_partner||null,campaign:o.metadata?.atlas_campaign||null},cfg);
  }
  return res.status(200).json({received:true,mode:cfg.mode});
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!enabled())return res.status(503).json({error:'billing_disabled'});
  const payload=await raw(req);
  try{
    const cfg=stripeConfig();
    if(req.headers['stripe-signature'])return webhook(req,res,payload,cfg);
    const body=payload.length?JSON.parse(payload.toString('utf8')):{};
    const u=await user(bearer(req));
    if(!u?.id)return res.status(401).json({error:'auth_required'});
    const origin=appOrigin(cfg);
    if(body.action==='portal'){
      const row=await plan(u.id,cfg);
      if(!row?.stripe_customer_id)return res.status(404).json({error:'billing_customer_not_found'});
      const s=await stripe('/billing_portal/sessions',{customer:row.stripe_customer_id,return_url:`${origin}/#atlas-pro`},cfg);
      return res.status(200).json({url:s.url,mode:cfg.mode});
    }
    const billing=body.billing==='monthly'?'monthly':'annual';
    const attribution=cleanAttribution(body.attribution||{});
    const sessionId=safeSessionId(body.sessionId);
    const success=new URL('/',origin);
    success.searchParams.set('billing','success');
    if(attribution.partner)success.searchParams.set('ref',attribution.partner);
    success.hash='atlas-pro';
    const cancel=new URL('/',origin);
    if(attribution.partner)cancel.searchParams.set('ref',attribution.partner);
    cancel.hash='atlas-pro';
    const checkoutBody={
      mode:'subscription',
      'line_items[0][price]':cfg.prices[billing],
      'line_items[0][quantity]':'1',
      customer_email:u.email,
      client_reference_id:u.id,
      'subscription_data[metadata][atlas_user_id]':u.id,
      'subscription_data[metadata][atlas_stripe_mode]':cfg.mode,
      'metadata[atlas_user_id]':u.id,
      'metadata[atlas_billing]':billing,
      'metadata[atlas_stripe_mode]':cfg.mode,
      success_url:success.toString(),
      cancel_url:cancel.toString(),
      allow_promotion_codes:'true'
    };
    if(sessionId){checkoutBody['metadata[atlas_session_id]']=sessionId;checkoutBody['subscription_data[metadata][atlas_session_id]']=sessionId;}
    if(attribution.partner){checkoutBody['metadata[atlas_partner]']=attribution.partner;checkoutBody['subscription_data[metadata][atlas_partner]']=attribution.partner;}
    if(attribution.campaign){checkoutBody['metadata[atlas_campaign]']=attribution.campaign;checkoutBody['subscription_data[metadata][atlas_campaign]']=attribution.campaign;}
    const s=await stripe('/checkout/sessions',checkoutBody,cfg);
    return res.status(200).json({url:s.url,mode:cfg.mode});
  }catch(e){
    console.error('billing_failed',{message:e?.message||'billing_failed'});
    return res.status(500).json({error:e?.message||'billing_failed'});
  }
}
