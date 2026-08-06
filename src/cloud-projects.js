const TABLE='atlas_projects';

function auth(){return window.AtlasAuth||null;}
function session(){return auth()?.getSession?.()||null;}
function config(){return auth()?.getConfig?.()||null;}
function ready(){const s=session(),c=config();return Boolean(s?.access_token&&s?.user?.id&&c?.enabled&&c?.url&&c?.anonKey);}
function headers(extra={}){const s=session(),c=config();return {'content-type':'application/json','apikey':c.anonKey,'authorization':`Bearer ${s.access_token}`,...extra};}
async function request(query='',options={}){if(!ready())throw new Error('cloud_not_ready');const c=config();const response=await fetch(`${c.url}/rest/v1/${TABLE}${query}`,{...options,headers:headers(options.headers||{})});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message||data.error||`cloud_${response.status}`);}if(response.status===204)return null;return response.json().catch(()=>null);}
function row(project){const s=session();return {user_id:s.user.id,client_id:String(project.id),name:String(project.name||'Proyecto Atlas').slice(0,160),project_data:project,schema_version:1};}
export function cloudReady(){return ready();}
export async function listCloudProjects(){const data=await request('?select=client_id,project_data,updated_at&order=updated_at.desc');return Array.isArray(data)?data.map(item=>item.project_data).filter(Boolean):[];}
export async function upsertCloudProject(project){const data=await request('?on_conflict=user_id,client_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row(project))});return Array.isArray(data)?data[0]:data;}
export async function deleteCloudProject(clientId){await request(`?client_id=eq.${encodeURIComponent(clientId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
export async function syncLocalProjects(projects=[]){if(!ready())return {synced:false,projects};const cloud=await listCloudProjects();const merged=new Map();for(const project of [...cloud,...projects]){if(!project?.id)continue;const previous=merged.get(project.id);if(!previous||new Date(project.updatedAt||0)>=new Date(previous.updatedAt||0))merged.set(project.id,project);}
const result=[...merged.values()];await Promise.all(result.map(upsertCloudProject));return {synced:true,projects:result};}
