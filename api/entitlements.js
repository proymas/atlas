const EDGE_URL='https://ntrnchrtnfjyrsagxxbo.supabase.co/functions/v1/atlas-entitlements';

function bearer(req){
  const value=String(req.headers.authorization||'');
  return value.toLowerCase().startsWith('bearer ')?value.slice(7).trim():'';
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  const token=bearer(req);
  if(!token)return res.status(401).json({error:'unauthorized'});
  try{
    const response=await fetch(EDGE_URL,{headers:{authorization:`Bearer ${token}`}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return res.status(response.status).json(data);
    return res.status(200).json(data);
  }catch(error){
    console.error('atlas_entitlements_proxy_failed',error);
    return res.status(502).json({error:'entitlements_unavailable'});
  }
}
