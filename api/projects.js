const TABLE = 'atlas_projects';

function env() {
  const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, anonKey, serviceKey };
}

function bearer(req) {
  const value = String(req.headers.authorization || '');
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

async function authenticatedUser(req, config) {
  const token = bearer(req);
  if (!token) return null;
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? user : null;
}

function adminHeaders(config, extra = {}) {
  return {
    'content-type': 'application/json',
    apikey: config.serviceKey,
    authorization: `Bearer ${config.serviceKey}`,
    ...extra,
  };
}

async function adminRequest(config, query = '', options = {}) {
  const response = await fetch(`${config.url}/rest/v1/${TABLE}${query}`, {
    ...options,
    headers: adminHeaders(config, options.headers || {}),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const message = data?.message || data?.error || `supabase_${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const config = env();
  if (!config.url || !config.anonKey || !config.serviceKey) {
    return res.status(503).json({ error: 'cloud_not_configured' });
  }

  const user = await authenticatedUser(req, config);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'GET') {
      const uid = encodeURIComponent(user.id);
      const data = await adminRequest(
        config,
        `?user_id=eq.${uid}&select=client_id,project_data,updated_at&order=updated_at.desc`,
        { method: 'GET' },
      );
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === 'POST') {
      const project = req.body?.project;
      if (!project || !project.id) return res.status(400).json({ error: 'invalid_project' });
      const row = {
        user_id: user.id,
        client_id: String(project.id),
        name: String(project.name || 'Proyecto Atlas').slice(0, 160),
        project_data: project,
        schema_version: 1,
      };
      const data = await adminRequest(
        config,
        '?on_conflict=user_id,client_id',
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(row),
        },
      );
      return res.status(200).json(Array.isArray(data) ? data[0] || null : data);
    }

    if (req.method === 'DELETE') {
      const clientId = String(req.body?.clientId || '').trim();
      if (!clientId) return res.status(400).json({ error: 'invalid_project_id' });
      const uid = encodeURIComponent(user.id);
      const cid = encodeURIComponent(clientId);
      await adminRequest(
        config,
        `?user_id=eq.${uid}&client_id=eq.${cid}`,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
      );
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    console.error('atlas_projects_api_failed', error);
    return res.status(502).json({ error: 'cloud_request_failed', detail: error?.message || 'unknown' });
  }
}
