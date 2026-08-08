const DEFAULT_TIMEOUT_MS=65000;

function errorMessage(data,status){
  if(data&&typeof data==='object'&&typeof data.error==='string'&&data.error.trim())return data.error;
  if(status===429)return 'Has alcanzado temporalmente el límite de uso. Inténtalo de nuevo en unos minutos.';
  if(status>=500)return 'Atlas no pudo completar la solicitud. Inténtalo de nuevo.';
  return 'No se pudo completar la solicitud.';
}

export async function post(path,payload,{timeoutMs=DEFAULT_TIMEOUT_MS,signal}={}){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(new DOMException('Request timed out','TimeoutError')),timeoutMs);
  const abort=()=>controller.abort(signal?.reason);
  if(signal){
    if(signal.aborted)abort();
    else signal.addEventListener('abort',abort,{once:true});
  }
  try{
    const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    let data={};
    try{data=await response.json();}catch{}
    if(!response.ok){
      const error=new Error(errorMessage(data,response.status));
      error.status=response.status;
      error.code=data?.error||`http_${response.status}`;
      throw error;
    }
    return data;
  }catch(error){
    if(error?.name==='AbortError'||error?.name==='TimeoutError'){
      const timeoutError=new Error('La solicitud ha tardado demasiado. Inténtalo de nuevo.');
      timeoutError.code='request_timeout';
      throw timeoutError;
    }
    throw error;
  }finally{
    clearTimeout(timeout);
    signal?.removeEventListener?.('abort',abort);
  }
}
