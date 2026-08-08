import crypto from 'node:crypto';

const STRIPE='https://api.stripe.com/v1';
const LIVE_PRICES={
  monthly:'price_1U2825ENQtHnWsv9hHUAuODi',
  annual:'price_1U283aENQtHnWsv9mUQrXGy8',
};

export const config={api:{bodyParser:false}};

const enabled=()=>process.env.ATLAS_BILLING_ENABLED==='true';
const billingMode=()=>String(process.env.ATLAS_BILLING_MODE||'live').trim().toLowerCase()==='test'?'test':'live';
const isTestMode=()=>billingMode()==='test';
const supabaseUrl=()=>String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://ntrnchrtnfjyrsagxxbo.supabase.co').trim().replace(/\/$/,'');
const anonKey=()=>String(process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'').trim();

function appOrigin(){
  const configured=String(process.env.ATLAS_APP_ORIGIN||'').trim().replace(/\/$/,'');
  if(configured)return configured;
  const vercel=String(process.env.VERCEL_URL||'').trim().replace(/\/$/,'');
  return vercel?`https://${vercel}`:'https://atlas-beta-2.vercel.app';
}

function stripeConfig(){
  if(isTestMode()){
    const prices={
      monthly:String(process.env.STRIPE_TEST_PRICE_MONTHLY||'').trim(),
      annual:String(process.env.STRIPE_TEST_PRICE_ANNUAL||'').trim(),
    };
    const secret=String(process.env.STRIPE_TEST_SECRET_KEY||'').trim();
    const webhookSecret=String(process.env.STRIPE_TEST_WEBHOOK_SECRET||'').trim();
    if(!secret||(!secret.startsWith('sk_test_')&&!secret.startsWith('rk_test_')))throw new Error('stripe_test_key_not_configured');
    if(!prices.monthly||!prices.annual)throw new Error('stripe_test_prices_not_configured');
    return {mode:'test',secret,webhookSecret,prices};
  }
  return {
    mode:'live',
    secret:String(process.env.STRIPE_SECRET_KEY||'').trim(),
    webhookSecret:String(process.env.STRIPE_WEBHOOK_SECRET||'').trim(),
    prices:LIVE_PRICES,
  };
}

async function raw(req){const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));return Buffer.concat(chunks);}
function bearer(req){const v=String(req.headers.authorization||'');return v.toLowerCase().startsWith('bearer ')?v.slice(7):'';}
async function user(token){const key=anonKey(),url=supabaseUrl();if(!url||!key||!token)return null;const r=await fetch(`${url}/auth/v1/user`,{headers:{authorization:`Bearer ${token}`,apikey:key}});return r.ok?r.json():null;}

async function stripe(path,body,cfg){
  if(!cfg.secret)throw new Error('stripe_not_configured');
  const r=await fetch(`${STRIPE}${path}`,{method:'POST',headers:{authorization:`Bearer ${cfg.secret}`,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)}),d=await r.json();
  if(!r.ok)throw new Error(d?.error?.message||'stripe_failed');
  return d;
}

async function plan(userId){const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=supabaseUrl();if(!key||!url)throw new Error('supabase_service_not_configured');const r=await fetch(`${url}/rest/v1/atlas_user_plans?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,{headers:{authorization:`Bearer ${key}`,apikey:key}}),rows=await r.json();return r.ok?rows?.[0]:null;}
async function patch(userId,data){const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=supabaseUrl();if(!key||!url)throw new Error('supabase_service_not_configured');const r=await fetch(`${url}/rest/v1/atlas_user_plans?user_id=eq.${encodeURIComponent(userId)}`,{method:'PATCH',headers:{authorization:`Bearer ${key}`,apikey:key,'content-type':'application/json',prefer:'return=minimal'},body:JSON.stringify({...data,updated_at:new Date().toISOString()})});if(!r.ok)throw new Error('plan_update_failed');}

function verify(payload,header,secret){
  if(!secret||!header)return false;
  const parts={};
  for(const piece of header.split(',')){const [key,value]=piece.split('=');if(key&&value&&!parts[key])parts[key]=value;}
  const signed=`${parts.t}.${payload.toString('utf8')}`,expected=crypto.createHmac('sha256',secret).update(signed).digest('hex'),given=parts.v1||'';
  return expected.length===given.length&&crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(given));
}

async function webhook(req,res,payload,cfg){
  if(!verify(payload,String(req.headers['stripe-signature']||''),cfg.webhookSecret))return res.status(400).json({error:'invalid_signature'});
  const event=JSON.parse(payload.toString('utf8'));
  if(Boolean(event.livemode)!==(cfg.mode==='live'))return res.status(400).json({error:'stripe_mode_mismatch'});
  const o=event.data?.object||{};
  if(event.type.startsWith('customer.subscription.')&&o.metadata?.atlas_user_id){
    const interval=Object.fromEntries(Object.entries(cfg.prices).map(([k,v])=>[v,k]));
    const price=o.items?.data?.[0]?.price?.id||null,pro=['active','trialing'].includes(o.status);
    await patch(o.metadata.atlas_user_id,{
      plan:pro?'pro':'free',
      status:pro?'active':o.status||'inactive',
      source:cfg.mode==='test'?'stripe_test':'stripe',
      stripe_customer_id:o.customer||null,
      stripe_subscription_id:o.id||null,
      stripe_price_id:price,
      billing_interval:interval[price]||null,
      current_period_end:o.current_period_end?new Date(o.current_period_end*1000).toISOString():null,
      cancel_at_period_end:Boolean(o.cancel_at_period_end),
    });
  }
  return res.status(200).json({received:true,mode:cfg.mode});
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!enabled())return res.status(503).json({error:'billing_disabled'});
  const payload=await raw(req);
  try{
    const cfg=stripeConfig();
    if(req.headers['stripe-signature'])return webhook(req,res,payload,cfg);
    const body=payload.length?JSON.parse(payload.toString('utf8')):{},u=await user(bearer(req));
    if(!u?.id)return res.status(401).json({error:'auth_required'});
    const origin=appOrigin();
    if(body.action==='portal'){
      const row=await plan(u.id);
      if(!row?.stripe_customer_id)return res.status(404).json({error:'billing_customer_not_found'});
      const s=await stripe('/billing_portal/sessions',{customer:row.stripe_customer_id,return_url:`${origin}/#atlas-pro`},cfg);
      return res.status(200).json({url:s.url,mode:cfg.mode});
    }
    const billing=body.billing==='monthly'?'monthly':'annual';
    const s=await stripe('/checkout/sessions',{
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
      success_url:`${origin}/?billing=success#atlas-pro`,
      cancel_url:`${origin}/#atlas-pro`,
      allow_promotion_codes:'true',
    },cfg);
    return res.status(200).json({url:s.url,mode:cfg.mode});
  }catch(e){
    console.error('billing_failed',e);
    return res.status(500).json({error:e?.message||'billing_failed'});
  }
}
