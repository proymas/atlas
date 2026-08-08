const mode=String(process.env.ATLAS_BILLING_MODE||'').trim().toLowerCase();
const secret=String(process.env.STRIPE_TEST_SECRET_KEY||'').trim();
if(mode!=='test'||(!secret.startsWith('sk_test_')&&!secret.startsWith('rk_test_'))){
  console.log('atlas_test_cancel: skipped outside isolated TEST mode');
  process.exit(0);
}
const auth={authorization:`Bearer ${secret}`};
const listResponse=await fetch('https://api.stripe.com/v1/subscriptions?status=all&limit=100',{headers:auth});
const list=await listResponse.json();
if(!listResponse.ok)throw new Error(list?.error?.message||'stripe_list_failed');
const sub=(list.data||[]).find(item=>['active','trialing','past_due'].includes(item.status)&&item?.metadata?.atlas_stripe_mode==='test'&&item?.metadata?.atlas_user_id);
if(!sub){console.log('atlas_test_cancel: no active Atlas TEST subscription found');process.exit(0);}
const response=await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.id)}`,{method:'DELETE',headers:auth});
const data=await response.json();
if(!response.ok)throw new Error(data?.error?.message||'stripe_cancel_failed');
console.log(`atlas_test_cancel: canceled ${sub.id} for ${sub.metadata.atlas_user_id}`);
