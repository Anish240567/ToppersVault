// /api/storage — backs the frontend's window.storage polyfill.
//
// This is a SINGLE SHARED store: there is no per-user login in the
// Topper Vault app, so every key here is global — one visitor's
// "Import Dataset" or "Add PDF" is visible to every other visitor.
// That's what makes those features actually work once deployed.
//
// Requires a Vercel KV (Upstash Redis) database attached to this
// project — Vercel Storage tab -> Create Database -> KV -> Connect
// to Project. That injects the KV_REST_API_URL / KV_REST_API_TOKEN
// env vars automatically; you don't need to set them by hand.

import { kv } from '@vercel/kv';

const NS = 'kosha:'; // namespace prefix, in case this KV is reused elsewhere

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const key = req.query.key;
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'key query param required' });
      }
      const value = await kv.get(NS + key);
      if (value === null || value === undefined) {
        // Match window.storage.get()'s "not found" contract (null)
        return res.status(200).json(null);
      }
      return res.status(200).json({ key, value, shared: true });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const { key, value } = body;
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'key required in body' });
      }
      await kv.set(NS + key, value);
      return res.status(200).json({ key, value, shared: true });
    }

    if (req.method === 'DELETE') {
      const key = req.query.key;
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ error: 'key query param required' });
      }
      await kv.del(NS + key);
      return res.status(200).json({ key, deleted: true, shared: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('storage error', err);
    return res.status(500).json({
      error: 'Storage error — is a Vercel KV database attached to this project?',
      detail: String((err && err.message) || err)
    });
  }
}
