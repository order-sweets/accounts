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
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const res = await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ value: JSON.stringify(value) })
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

  // Secret key check
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.SYNC_API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
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
