let initialized=false;

function triggerWorkspaceEnhancers(){
  const probe=document.createElement('button');
  probe.type='button';
  probe.className='workspace-back';
  probe.hidden=true;
  document.body.appendChild(probe);
  probe.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  probe.remove();
}

function observeWorkspace(){
  if(initialized)return;
  const attach=()=>{
    const target=document.getElementById('workspace-list');
    if(!target)return false;
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{
        queued=false;
        triggerWorkspaceEnhancers();
      });
    });
    observer.observe(target,{childList:true,subtree:false});
    initialized=true;
    return true;
  };
  if(attach())return;
  const rootObserver=new MutationObserver(()=>{
    if(attach())rootObserver.disconnect();
  });
  rootObserver.observe(document.body,{childList:true,subtree:true});
}

observeWorkspace();
