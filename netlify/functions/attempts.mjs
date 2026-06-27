// Serverless backend for the UAE Tax quiz - stores student attempts in Netlify Blobs.
// Reachable at /.netlify/functions/attempts  (same origin, so the site CSP allows it).
import { getStore } from "@netlify/blobs";

const KEY = "all";

export default async (req) => {
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  try {
    const store = getStore("quiz_attempts");

    if (req.method === "GET") {
      const all = (await store.get(KEY, { type: "json" })) || [];
      return new Response(JSON.stringify(all), { headers });
    }

    if (req.method === "POST") {
      const att = await req.json();
      if (!att || typeof att !== "object") {
        return new Response(JSON.stringify({ error: "bad body" }), { status: 400, headers });
      }
      att.ts = att.ts || Date.now();
      const all = (await store.get(KEY, { type: "json" })) || [];
      all.push(att);
      const trimmed = all.slice(-8000);
      await store.setJSON(KEY, trimmed);
      return new Response(JSON.stringify({ ok: true, count: trimmed.length }), { headers });
    }

    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers });
  }
};
