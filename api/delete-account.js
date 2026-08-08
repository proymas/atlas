const PROJECTS_BRIDGE_URL='https://ntrnchrtnfjyrsagxxbo.supabase.co/functions/v1/atlas-projects-bridge';

const getEnv=()=>({
  url:String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim().replace(/\/$/,''),
  anonKey:String(process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'').trim(),
  serviceKey:String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim(),
});

async function purgeProjects(authorization){
  const list=await fetch(PROJECTS_BRIDGE_URL,{headers:{authorization,'content-type':'application/json'}});
  if(!list.ok)throw new Error(`project_purge_list_${list.status}`);
  const data=await list.json().catch(()=>({}));
  const projects=Array.isArray(data?.projects)?data.projects:[];
  for(const project of projects){
    if(!project?.id)continue;
    const response=await fetch(`${PROJECTS_BRIDGE_URL}?client_id=${encodeURIComponent(project.id)}`,{method:'DELETE',headers:{authorization,'content-type':'application/json'}});
    if(!response.ok)throw new Error(`project_purge_delete_${response.status}`);
  }
  return projects.length;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const {url,anonKey,serviceKey}=getEnv();
  if(!url||!anonKey||!serviceKey)return res.status(503).json({error:'Account deletion is not configured'});

  const authorization=String(req.headers.authorization||'');
  if(!authorization.toLowerCase().startsWith('bearer '))return res.status(401).json({error:'Unauthorized'});

  try{
    const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anonKey,authorization}});
    const user=await userResponse.json().catch(()=>null);
    if(!userResponse.ok||!user?.id)return res.status(401).json({error:'Your session is no longer valid. Sign in again and retry.'});

    // Project content is stored in the separate Atlas data project. Purge it while
    // the user's token is still valid; do not create a half-deleted account if this fails.
    const purgedProjects=await purgeProjects(authorization);

    const deleteResponse=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`,{method:'DELETE',headers:{apikey:serviceKey,authorization:`Bearer ${serviceKey}`}});
    const result=await deleteResponse.json().catch(()=>({}));
    if(!deleteResponse.ok)return res.status(deleteResponse.status).json({error:result?.msg||result?.message||result?.error||'Could not delete account'});

    return res.status(200).json({ok:true,purgedProjects});
  }catch(error){
    console.error('delete-account',{message:error?.message||'delete_failed'});
    return res.status(500).json({error:'Could not delete account safely. No further deletion was performed.'});
  }
}
