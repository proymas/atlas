import { put } from '@vercel/blob';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
  if (!emailPattern.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const record = {
    type: 'atlas_pro_waitlist',
    email,
    source: String(body.source || 'unknown').slice(0, 80),
    language: String(body.language || 'unknown').slice(0, 20),
    country: req.headers['x-vercel-ip-country'] || 'unknown',
    createdAt: new Date().toISOString()
  };

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const id = `${Date.now()}-${crypto.randomUUID()}`;
      await put(`waitlist/${id}.json`, JSON.stringify(record), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
    } else {
      console.log(JSON.stringify(record));
    }
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('waitlist_write_failed', error);
    return res.status(500).json({ error: 'Could not save signup' });
  }
}
