const mode=String(process.env.ATLAS_BILLING_MODE||'').trim().toLowerCase();
const stripeSecret=String(process.env.STRIPE_TEST_SECRET_KEY||'').trim();
const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
const supabaseUrl=String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim().replace(/\/$/,'');
if(mode!=='test'||(!stripeSecret.startsWith('sk_test_')&&!stripeSecret.startsWith('rk_test_'))){
  console.log('atlas_test_verify: skipped outside isolated TEST mode');
  process.exit(0);
}
const listResponse=await fetch('https://api.stripe.com/v1/subscriptions?status=all&limit=100',{headers:{authorization:`Bearer ${stripeSecret}`}});
const list=await listResponse.json();
if(!listResponse.ok)throw new Error(list?.error?.message||'stripe_list_failed');
const sub=(list.data||[]).find(item=>item?.metadata?.atlas_stripe_mode==='test'&&item?.metadata?.atlas_user_id);
if(!sub)throw new Error('atlas_test_subscription_not_found');
if(!serviceKey||!supabaseUrl)throw new Error('supabase_service_not_configured');
await new Promise(resolve=>setTimeout(resolve,1500));
const userResponse=await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(sub.metadata.atlas_user_id)}`,{headers:{authorization:`Bearer ${serviceKey}`,apikey:serviceKey}});
const user=await userResponse.json();
if(!userResponse.ok)throw new Error(`supabase_admin_user_${userResponse.status}`);
const billing=user?.app_metadata?.atlas_test_billing||{};
console.log(`atlas_test_verify: subscription=${sub.status} entitlement=${billing.plan||'missing'} status=${billing.status||'missing'} source=${billing.source||'missing'}`);
if(billing.plan!=='free')throw new Error(`atlas_test_entitlement_expected_free_got_${billing.plan||'missing'}`);
