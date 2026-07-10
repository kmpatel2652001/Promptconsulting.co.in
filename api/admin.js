// Admin-only API: student reports, role management, user deletion.
// Every request is authorised server-side against the caller's stored role.
import {
  storeReady, kvGet, kvSet, kvDel, kvSRem, kvSMembers, kvPipeline,
  USERS_INDEX, userKey, progressKey, currentUser, isEnvAdmin, readBody,
} from "./_utils.js";

function parse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

// Compact per-student summary so the dashboard never receives password hashes
// or more raw data than it needs.
function summarize(progress) {
  if (!progress || !progress.state) return null;
  const s = progress.state;
  const status = (s.status && typeof s.status === "object") ? s.status : {};
  const extras = (s.extras && typeof s.extras === "object") ? s.extras : {};
  const perQual = {};
  (Array.isArray(s.quals) ? s.quals : []).forEach(q => { perQual[q] = { passed: 0, booked: 0, exempt: 0 }; });
  for (const k of Object.keys(status)) {
    const qid = k.split(":")[0];
    if (!perQual[qid]) perQual[qid] = { passed: 0, booked: 0, exempt: 0 };
    const v = status[k];
    if (v === "passed" || v === "booked" || v === "exempt") perQual[qid][v]++;
  }
  return {
    quals: Array.isArray(s.quals) ? s.quals : [],
    perQual,
    extrasDone: Object.keys(extras).length,
    updatedAt: progress.updatedAt || null,
  };
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (!storeReady()) { res.status(503).json({ error: "store not configured" }); return; }

  try {
    const me = await currentUser(req);
    if (!me) { res.status(401).json({ error: "sign in required" }); return; }
    if (me.role !== "admin") { res.status(403).json({ error: "admin access required" }); return; }

    if (req.method === "GET") {
      // GET /api/admin?action=report — all users + progress summaries
      const emails = await kvSMembers(USERS_INDEX);
      let users = [];
      if (emails.length) {
        const results = await kvPipeline([
          ["MGET", ...emails.map(userKey)],
          ["MGET", ...emails.map(progressKey)],
        ]);
        const userRows = Array.isArray(results[0]) ? results[0] : [];
        const progRows = Array.isArray(results[1]) ? results[1] : [];
        users = emails.map((email, i) => {
          const u = parse(userRows[i]);
          if (!u) return null;
          return {
            email: u.email,
            name: u.name,
            role: isEnvAdmin(u.email) ? "admin" : (u.role || "student"),
            envAdmin: isEnvAdmin(u.email),
            createdAt: u.createdAt || null,
            summary: summarize(parse(progRows[i])),
          };
        }).filter(Boolean);
      }
      res.status(200).json({ users });
      return;
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const target = email && await kvGet(userKey(email));
      if (!target) { res.status(404).json({ error: "user not found" }); return; }

      if (body.action === "setRole") {
        const role = body.role;
        if (role !== "student" && role !== "admin") { res.status(400).json({ error: "role must be student or admin" }); return; }
        if (isEnvAdmin(email)) { res.status(400).json({ error: "This user is a permanent admin (set via ADMIN_EMAILS) and cannot be changed here." }); return; }
        if (email === me.email && role !== "admin") { res.status(400).json({ error: "You cannot remove your own admin access." }); return; }
        target.role = role;
        await kvSet(userKey(email), target);
        res.status(200).json({ ok: true, email, role });
        return;
      }

      if (body.action === "deleteUser") {
        if (email === me.email) { res.status(400).json({ error: "You cannot delete your own account from here." }); return; }
        if (isEnvAdmin(email)) { res.status(400).json({ error: "Permanent admins cannot be deleted." }); return; }
        await kvDel(userKey(email));
        await kvDel(progressKey(email));
        await kvSRem(USERS_INDEX, email);
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: "unknown action" });
      return;
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
