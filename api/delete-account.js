const getEnv=()=>({
  url:String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim().replace(/\/$/,''),
  anonKey:String(process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'').trim(),
  serviceKey:String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim(),
});

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {url,anonKey,serviceKey}=getEnv();
  if(!url||!anonKey||!serviceKey) return res.status(503).json({error:'Account deletion is not configured'});

  const authorization=String(req.headers.authorization||'');
  if(!authorization.startsWith('Bearer ')) return res.status(401).json({error:'Unauthorized'});

  try{
    const userResponse=await fetch(`${url}/auth/v1/user`,{
      headers:{apikey:anonKey,authorization}
    });
    const user=await userResponse.json().catch(()=>null);
    if(!userResponse.ok||!user?.id) return res.status(401).json({error:'Your session is no longer valid. Sign in again and retry.'});

    const deleteResponse=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`,{
      method:'DELETE',
      headers:{apikey:serviceKey,authorization:`Bearer ${serviceKey}`}
    });
    const result=await deleteResponse.json().catch(()=>({}));
    if(!deleteResponse.ok) return res.status(deleteResponse.status).json({error:result?.msg||result?.message||result?.error||'Could not delete account'});

    return res.status(200).json({ok:true});
  }catch(error){
    console.error('delete-account',error);
    return res.status(500).json({error:'Could not delete account'});
  }
}
