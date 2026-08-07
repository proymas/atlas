const BRIDGE_URL = 'https://ntrnchrtnfjyrsagxxbo.supabase.co/functions/v1/atlas-projects-bridge';

function bearer(req) {
  const value = String(req.headers.authorization || '');
  return value.toLowerCase().startsWith('bearer ') ? value : '';
}

async function bridge(req, path = '', options = {}) {
  const authorization = bearer(req);
  if (!authorization) {
    const error = new Error('unauthorized');
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${BRIDGE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      authorization,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const error = new Error(data?.error || `bridge_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const data = await bridge(req, '', { method: 'GET' });
      const projects = Array.isArray(data?.projects) ? data.projects : [];
      return res.status(200).json(projects.map((project) => ({ project_data: project })));
    }

    if (req.method === 'POST') {
      const project = req.body?.project;
      if (!project?.id) return res.status(400).json({ error: 'invalid_project' });
      const data = await bridge(req, '', {
        method: 'POST',
        body: JSON.stringify({ project }),
      });
      return res.status(200).json(data?.project || project);
    }

    if (req.method === 'DELETE') {
      const clientId = String(req.body?.clientId || '').trim();
      if (!clientId) return res.status(400).json({ error: 'invalid_project_id' });
      await bridge(req, `?client_id=${encodeURIComponent(clientId)}`, { method: 'DELETE' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    const status = Number(error?.status) || 502;
    console.error('atlas_projects_api_failed', error);
    return res.status(status === 401 ? 401 : 502).json({
      error: status === 401 ? 'unauthorized' : 'cloud_request_failed',
      detail: error?.message || 'unknown',
    });
  }
}
