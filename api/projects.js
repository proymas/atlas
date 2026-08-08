const PROJECTS_BRIDGE_URL = 'https://ntrnchrtnfjyrsagxxbo.supabase.co/functions/v1/atlas-projects-bridge';
const ENTITLEMENTS_BRIDGE_URL = 'https://ntrnchrtnfjyrsagxxbo.supabase.co/functions/v1/atlas-entitlements';

const billingMode=()=>String(process.env.ATLAS_BILLING_MODE||'live').trim().toLowerCase()==='test'?'test':'live';
const isTestMode=()=>billingMode()==='test';
const supabaseUrl=()=>String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim().replace(/\/$/,'');
const anonKey=()=>String(process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'').trim();
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

function bearer(req) {
  const value = String(req.headers.authorization || '');
  return value.toLowerCase().startsWith('bearer ') ? value : '';
}

function isClockSkew(data){
  return String(data?.error || data?.message || '').toLowerCase().includes('jwt issued at future');
}

async function bridge(req, baseUrl, path = '', options = {}) {
  const authorization = bearer(req);
  if (!authorization) {
    const error = new Error('unauthorized');
    error.status = 401;
    throw error;
  }

  let response;
  let data = null;
  const retryDelays=[0,750,1500];
  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if(retryDelays[attempt]) await sleep(retryDelays[attempt]);
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        authorization,
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if(response.ok || !isClockSkew(data)) break;
  }

  if (!response.ok) {
    const error = new Error(data?.error || `bridge_${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function testEntitlements(req){
  const authorization=bearer(req),url=supabaseUrl(),key=anonKey();
  if(!authorization||!url||!key){const error=new Error('unauthorized');error.status=401;throw error;}
  const response=await fetch(`${url}/auth/v1/user`,{headers:{authorization,apikey:key}});
  if(!response.ok){const error=new Error('unauthorized');error.status=401;throw error;}
  const user=await response.json();
  const billing=user?.app_metadata?.atlas_test_billing||{};
  return {plan:billing.plan==='pro'?'pro':'free',status:billing.status||'active',usage:{},billing};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET' && String(req.query?.mode || '') === 'entitlements') {
      const data=isTestMode()?await testEntitlements(req):await bridge(req, ENTITLEMENTS_BRIDGE_URL, '', { method: 'GET' });
      return res.status(200).json(data || { plan: 'free', status: 'active', usage: {} });
    }

    if (req.method === 'POST' && String(req.query?.mode || '') === 'consume-copilot') {
      const data = await bridge(req, ENTITLEMENTS_BRIDGE_URL, '', {
        method: 'POST',
        body: JSON.stringify({ action: 'consume', feature: 'copilot' }),
      });
      return res.status(200).json(data || { allowed: true });
    }

    if (req.method === 'GET') {
      const data = await bridge(req, PROJECTS_BRIDGE_URL, '', { method: 'GET' });
      const projects = Array.isArray(data?.projects) ? data.projects : [];
      return res.status(200).json(projects.map((project) => ({ project_data: project })));
    }

    if (req.method === 'POST') {
      const project = req.body?.project;
      if (!project?.id) return res.status(400).json({ error: 'invalid_project' });
      const data = await bridge(req, PROJECTS_BRIDGE_URL, '', {
        method: 'POST',
        body: JSON.stringify({ project }),
      });
      return res.status(200).json(data?.project || project);
    }

    if (req.method === 'DELETE') {
      const clientId = String(req.body?.clientId || '').trim();
      if (!clientId) return res.status(400).json({ error: 'invalid_project_id' });
      await bridge(req, PROJECTS_BRIDGE_URL, `?client_id=${encodeURIComponent(clientId)}`, { method: 'DELETE' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    const status = Number(error?.status) || 502;
    if (status === 429) {
      return res.status(429).json({
        error: 'copilot_limit',
        used: error?.data?.used ?? 8,
        limit: error?.data?.limit ?? 8,
        period: error?.data?.period || null,
      });
    }
    if(status!==401)console.error('atlas_projects_api_failed', error);
    return res.status(status === 401 ? 401 : 502).json({
      error: status === 401 ? 'unauthorized' : 'cloud_request_failed',
      detail: error?.message || 'unknown',
    });
  }
}
