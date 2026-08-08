let initialized=false;
let legacyProbe=null;

function getLegacyProbe(){
  if(legacyProbe?.isConnected)return legacyProbe;
  legacyProbe=document.createElement('button');
  legacyProbe.type='button';
  legacyProbe.className='workspace-back';
  legacyProbe.hidden=true;
  legacyProbe.tabIndex=-1;
  legacyProbe.setAttribute('aria-hidden','true');
  legacyProbe.dataset.workspaceRefreshBridge='';
  document.body.appendChild(legacyProbe);
  return legacyProbe;
}

function notifyWorkspaceRendered(){
  // New contract for workspace enhancers. New code should listen to this event
  // instead of inferring renders from unrelated clicks.
  window.dispatchEvent(new CustomEvent('atlas:workspace-rendered'));

  // Compatibility bridge for the existing Reanalysis / Compare / Experiment
  // enhancers while they are migrated independently. Reuse one inert node rather
  // than allocating/removing a fake button on every Workspace mutation.
  getLegacyProbe().dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:false}));
}

function observeWorkspace(){
  if(initialized)return;
  const attach=()=>{
    const target=document.getElementById('workspace-list');
    if(!target)return false;
    let frame=0;
    const observer=new MutationObserver(()=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        notifyWorkspaceRendered();
      });
    });
    observer.observe(target,{childList:true,subtree:false});
    initialized=true;
    notifyWorkspaceRendered();
    return true;
  };
  if(attach())return;
  const rootObserver=new MutationObserver(()=>{
    if(attach())rootObserver.disconnect();
  });
  rootObserver.observe(document.body,{childList:true,subtree:true});
}

observeWorkspace();
