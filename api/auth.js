// CharterTrack authentication: signup, login, logout, me.
// Roles: "student" (default) and "admin" (via ADMIN_EMAILS env or promotion in /api/admin).
import {
  storeReady, kvGet, kvSet, kvSAdd, USERS_INDEX, userKey,
  hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie,
  currentUser, isEnvAdmin, readBody, publicUser, rateHit, clientIp,
} from "./_utils.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (!storeReady()) { res.status(503).json({ error: "Accounts are not available yet — the data store is not configured." }); return; }

  try {
    if (req.method === "GET") {
      // GET /api/auth?action=me
      const u = await currentUser(req);
      res.status(200).json({ user: publicUser(u) });
      return;
    }
    if (req.method !== "POST") { res.status(405).json({ error: "method not allowed" }); return; }

    const body = readBody(req);
    const action = body.action;

    if (action === "logout") {
      clearAuthCookie(res);
      res.status(200).json({ ok: true });
      return;
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    // Basic brute-force protection: 20 attempts / 10 min per IP.
    if (await rateHit(clientIp(req), 600) > 20) {
      res.status(429).json({ error: "Too many attempts — try again in a few minutes." });
      return;
    }

    if (action === "signup") {
      const name = String(body.name || "").trim().slice(0, 80);
      if (!EMAIL_RE.test(email) || email.length > 254) { res.status(400).json({ error: "Enter a valid email address." }); return; }
      if (password.length < 8 || password.length > 200) { res.status(400).json({ error: "Password must be at least 8 characters." }); return; }
      if (await kvGet(userKey(email))) { res.status(409).json({ error: "An account with this email already exists — sign in instead." }); return; }
      const user = {
        email,
        name: name || email.split("@")[0],
        passHash: hashPassword(password),
        role: isEnvAdmin(email) ? "admin" : "student",
        createdAt: Date.now(),
      };
      await kvSet(userKey(email), user);
      await kvSAdd(USERS_INDEX, email);
      setAuthCookie(res, signToken({ e: email }));
      res.status(200).json({ user: publicUser(user) });
      return;
    }

    if (action === "login") {
      const user = await kvGet(userKey(email));
      if (!user || !verifyPassword(password, user.passHash)) {
        res.status(401).json({ error: "Wrong email or password." });
        return;
      }
      if (isEnvAdmin(user.email)) user.role = "admin";
      setAuthCookie(res, signToken({ e: email }));
      res.status(200).json({ user: publicUser(user) });
      return;
    }

    res.status(400).json({ error: "unknown action" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
