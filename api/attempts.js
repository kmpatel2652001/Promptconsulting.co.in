// Vercel serverless backend for the UAE Tax quiz.
// Stores student attempts in a Vercel-connected Redis store (Vercel KV / Upstash).
// Connect a KV store to this project in the Vercel dashboard and it works automatically.
const STORE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const STORE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "quiz_attempts";

async function kvGet() {
  const r = await fetch(STORE_URL + "/get/" + KEY, { headers: { Authorization: "Bearer " + STORE_TOKEN } });
  const j = await r.json();
  if (!j || j.result == null) return [];
  try { return JSON.parse(j.result); } catch (e) { return []; }
}
async function kvSet(arr) {
  await fetch(STORE_URL + "/set/" + KEY, {
    method: "POST",
    headers: { Authorization: "Bearer " + STORE_TOKEN },
    body: JSON.stringify(arr),
  });
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (!STORE_URL || !STORE_TOKEN) {
    res.status(503).json({ error: "store not configured" });
    return;
  }
  try {
    if (req.method === "GET") {
      const all = await kvGet();
      res.status(200).json(all);
      return;
    }
    if (req.method === "POST") {
      const att = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!att || typeof att !== "object") { res.status(400).json({ error: "bad body" }); return; }
      att.ts = att.ts || Date.now();
      const all = await kvGet();
      all.push(att);
      const trimmed = all.slice(-8000);
      await kvSet(trimmed);
      res.status(200).json({ ok: true, count: trimmed.length });
      return;
    }
    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
