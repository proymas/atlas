const WORKSPACE_KEY='atlas-pro-workspace-v1';
const ACTIVE_KEY='atlas-pro-active-project';

function clearAccountCache(){
  localStorage.removeItem(WORKSPACE_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}

window.addEventListener('atlas:auth',event=>{
  if(!event.detail?.session) clearAccountCache();
});
