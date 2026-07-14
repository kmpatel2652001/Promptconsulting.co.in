// Per-student tracker progress sync. Students can only read/write their own plan.
import { storeReady, kvGet, kvSet, progressKey, currentUser, readBody } from "./_utils.js";

// Roomy enough for per-subject question notes (subject trackers) on top of the plan itself.
const MAX_BYTES = 400000;

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (!storeReady()) { res.status(503).json({ error: "store not configured" }); return; }

  try {
    const user = await currentUser(req);
    if (!user) { res.status(401).json({ error: "sign in required" }); return; }

    if (req.method === "GET") {
      const p = await kvGet(progressKey(user.email));
      res.status(200).json(p || { state: null, updatedAt: null });
      return;
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const state = body.state;
      if (!state || typeof state !== "object" || Array.isArray(state)) { res.status(400).json({ error: "bad state" }); return; }
      if (JSON.stringify(state).length > MAX_BYTES) { res.status(413).json({ error: "plan too large" }); return; }
      const rec = { state, updatedAt: Date.now() };
      await kvSet(progressKey(user.email), rec);
      res.status(200).json({ ok: true, updatedAt: rec.updatedAt });
      return;
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
