function auth(){return window.AtlasAuth||null;}
function session(){return auth()?.getSession?.()||null;}
function ready(){const s=session();return Boolean(s?.access_token&&s?.user?.id);}

function headers(extra={}){
  const s=session();
  return {'content-type':'application/json','authorization':`Bearer ${s.access_token}`,...extra};
}

async function request(options={}){
  if(!ready())throw new Error('cloud_not_ready');
  const response=await fetch('/api/projects',{...options,headers:headers(options.headers||{})});
  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new Error(data.detail||data.error||`cloud_${response.status}`);
  }
  if(response.status===204)return null;
  return response.json().catch(()=>null);
}

export function cloudReady(){return ready();}

export async function listCloudProjects(){
  const data=await request({method:'GET'});
  return Array.isArray(data)?data.map(item=>item.project_data).filter(Boolean):[];
}

export async function upsertCloudProject(project){
  return request({method:'POST',body:JSON.stringify({project})});
}

export async function deleteCloudProject(clientId){
  await request({method:'DELETE',body:JSON.stringify({clientId})});
}

export async function syncLocalProjects(projects=[]){
  if(!ready())return {synced:false,projects};
  const cloud=await listCloudProjects();
  const merged=new Map();
  for(const project of [...cloud,...projects]){
    if(!project?.id)continue;
    const previous=merged.get(project.id);
    if(!previous||new Date(project.updatedAt||0)>=new Date(previous.updatedAt||0))merged.set(project.id,project);
  }
  const result=[...merged.values()];
  await Promise.all(result.map(upsertCloudProject));
  return {synced:true,projects:result};
}
