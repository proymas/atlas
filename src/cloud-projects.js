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
    const error=new Error(data.detail||data.error||`cloud_${response.status}`);
    error.status=response.status;
    throw error;
  }
  if(response.status===204)return null;
  return response.json().catch(()=>null);
}

function stamp(project){const value=Date.parse(project?.updatedAt||'');return Number.isFinite(value)?value:0;}
function sameVersion(a,b){return Boolean(a?.id&&b?.id&&a.id===b.id&&stamp(a)===stamp(b));}
async function inBatches(items,worker,size=4){
  for(let i=0;i<items.length;i+=size)await Promise.all(items.slice(i,i+size).map(worker));
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
  const local=Array.isArray(projects)?projects.filter(project=>project?.id):[];
  const cloud=await listCloudProjects();
  const cloudById=new Map(cloud.filter(project=>project?.id).map(project=>[project.id,project]));
  const merged=new Map();
  for(const project of [...cloud,...local]){
    if(!project?.id)continue;
    const previous=merged.get(project.id);
    if(!previous||stamp(project)>=stamp(previous))merged.set(project.id,project);
  }
  const result=[...merged.values()];
  const writes=result.filter(project=>{
    const remote=cloudById.get(project.id);
    if(!remote)return true;
    if(sameVersion(project,remote))return false;
    return stamp(project)>stamp(remote);
  });
  await inBatches(writes,upsertCloudProject,4);
  return {synced:true,projects:result,writes:writes.length};
}
