// api/sync.js — Vercel serverless function for accounts data sync
// Uses Upstash Redis REST API (no SDK needed)

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const DB_KEY = 'bee-accounts-db';

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json();
  if (!data.result) return null;
  // Upstash returns the stored value as a string in data.result — parse once
  let parsed = data.result;
  if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(e) { return null; } }
  return parsed;
}

async function kvSet(key, value) {
  // Upstash REST SET expects the value as a JSON string in the body
  const res = await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(JSON.stringify(value))
  });
  return res.json();
}

export default async function handler(req, res) {
  // CORS headers — allow your GitHub Pages domain only
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Load DB
      const db = await kvGet(DB_KEY);
      return res.status(200).json({ ok: true, db: db || { shipments: [], expenses: [], amazonOrders: [] } });
    }

    if (req.method === 'POST') {
      // Save DB
      const { db } = req.body;
      if (!db) return res.status(400).json({ ok: false, error: 'No db provided' });
      await kvSet(DB_KEY, db);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('sync error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
