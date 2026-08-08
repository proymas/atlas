const STRIPE_API='https://api.stripe.com/v1';
const SUPABASE_URL='https://ntrnchrtnfjyrsagxxbo.supabase.co';
const PRICE_IDS={monthly:'price_1U2825ENQtHnWsv9hHUAuODi',annual:'price_1U283aENQtHnWsv9mUQrXGy8'};

function bearer(req){const value=String(req.headers.authorization||'');return value.toLowerCase().startsWith('bearer ')?value.slice(7):'';}
function enabled(){return process.env.ATLAS_BILLING_ENABLED==='true';}
async function userFromToken(token){const key=process.env.SUPABASE_ANON_KEY;if(!key||!token)return null;const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{authorization:`Bearer ${token}`,apikey:key}});return response.ok?response.json():null;}
async function stripe(path,body){const secret=process.env.STRIPE_SECRET_KEY;if(!secret)throw new Error('stripe_not_configured');const response=await fetch(`${STRIPE_API}${path}`,{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||'stripe_request_failed');return data;}

export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!enabled())return res.status(503).json({error:'billing_disabled',message:'Atlas billing is prepared but not enabled.'});
 try{
  const token=bearer(req),user=await userFromToken(token);if(!user?.id||!user?.email)return res.status(401).json({error:'auth_required'});
  const billing=req.body?.billing==='monthly'?'monthly':'annual',price=PRICE_IDS[billing];
  const origin='https://atlas-beta-2.vercel.app';
  const session=await stripe('/checkout/sessions',{mode:'subscription','line_items[0][price]':price,'line_items[0][quantity]':'1',customer_email:user.email,client_reference_id:user.id,'subscription_data[metadata][atlas_user_id]':user.id,'metadata[atlas_user_id]':user.id,'metadata[atlas_billing]':billing,success_url:`${origin}/?billing=success#atlas-pro`,cancel_url:`${origin}/#atlas-pro`,'allow_promotion_codes':'true'});
  return res.status(200).json({url:session.url});
 }catch(error){console.error('billing_checkout_failed',error);return res.status(500).json({error:'checkout_failed'});}
}