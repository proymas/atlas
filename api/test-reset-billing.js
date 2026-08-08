const SUPABASE_FALLBACK='https://nnmztjqmnlvenvjsuqxc.supabase.co';
const url=()=>String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||SUPABASE_FALLBACK).trim().replace(/\/$/,'');
const service=()=>String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
const anon=()=>String(process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'').trim();
function bearer(req){const v=String(req.headers.authorization||'');return v.toLowerCase().startsWith('bearer ')?v.slice(7):'';}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 if(String(process.env.ATLAS_BILLING_MODE||'').toLowerCase()!=='test')return res.status(404).json({error:'not_found'});
 const token=bearer(req),base=url(),a=anon(),key=service();
 if(!token||!a||!key)return res.status(401).json({error:'auth_required'});
 const ur=await fetch(`${base}/auth/v1/user`,{headers:{authorization:`Bearer ${token}`,apikey:a}});
 if(!ur.ok)return res.status(401).json({error:'auth_required'});
 const u=await ur.json();
 const ar=await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(u.id)}`,{headers:{authorization:`Bearer ${key}`,apikey:key}});
 if(!ar.ok)return res.status(500).json({error:'admin_read_failed'});
 const current=await ar.json();
 const app_metadata={...(current.app_metadata||{}),atlas_test_billing:{plan:'free',status:'inactive',source:'qa_reset',stripe_customer_id:null,stripe_subscription_id:null,stripe_price_id:null,billing_interval:null,current_period_end:null,cancel_at_period_end:false,updated_at:new Date().toISOString()}};
 const pr=await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(u.id)}`,{method:'PUT',headers:{authorization:`Bearer ${key}`,apikey:key,'content-type':'application/json'},body:JSON.stringify({app_metadata})});
 if(!pr.ok)return res.status(500).json({error:'reset_failed'});
 return res.status(200).json({ok:true,plan:'free',mode:'test'});
}
