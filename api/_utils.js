// Shared helpers for CharterTrack auth + access control.
// Files starting with "_" in /api are not deployed as endpoints by Vercel.
import crypto from "node:crypto";

const STORE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const STORE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
// Set AUTH_SECRET in Vercel for token signing; falls back to the KV token so
// auth works with zero extra config (rotating the KV token then logs everyone out).
const SECRET = process.env.AUTH_SECRET || STORE_TOKEN || "";
// Emails here are always treated as admins, even before they sign up.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "kirtan.patel@theaccountant.ae")
  .toLowerCase().split(",").map(s => s.trim()).filter(Boolean);

export const USERS_INDEX = "ct:users";
export const userKey = email => "ct:user:" + email;
export const progressKey = email => "ct:progress:" + email;

export function storeReady() { return !!(STORE_URL && STORE_TOKEN); }
export function isEnvAdmin(email) { return ADMIN_EMAILS.includes(String(email).toLowerCase()); }

/* ---------- KV (Upstash / Vercel KV REST) ---------- */
async function kvFetch(path, opts = {}) {
  const r = await fetch(STORE_URL + path, {
    ...opts,
    headers: { Authorization: "Bearer " + STORE_TOKEN, ...(opts.headers || {}) },
  });
  return r.json();
}
export async function kvGet(key) {
  const j = await kvFetch("/get/" + encodeURIComponent(key));
  if (!j || j.result == null) return null;
  try { return JSON.parse(j.result); } catch (e) { return null; }
}
export async function kvSet(key, val) {
  await kvFetch("/set/" + encodeURIComponent(key), { method: "POST", body: JSON.stringify(val) });
}
export async function kvDel(key) {
  await kvFetch("/del/" + encodeURIComponent(key), { method: "POST" });
}
export async function kvSAdd(key, member) {
  await kvFetch("/sadd/" + encodeURIComponent(key) + "/" + encodeURIComponent(member), { method: "POST" });
}
export async function kvSRem(key, member) {
  await kvFetch("/srem/" + encodeURIComponent(key) + "/" + encodeURIComponent(member), { method: "POST" });
}
export async function kvSMembers(key) {
  const j = await kvFetch("/smembers/" + encodeURIComponent(key));
  return Array.isArray(j && j.result) ? j.result : [];
}
export async function kvPipeline(cmds) {
  const j = await kvFetch("/pipeline", { method: "POST", body: JSON.stringify(cmds) });
  return Array.isArray(j) ? j.map(x => (x ? x.result : null)) : [];
}
// Sliding-window-ish rate limit: returns the attempt count in the window.
export async function rateHit(bucket, ttlSeconds) {
  const key = "ct:rl:" + bucket;
  const r = await kvPipeline([["INCR", key], ["EXPIRE", key, String(ttlSeconds)]]);
  return Number(r[0]) || 0;
}

/* ---------- passwords ---------- */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return salt + ":" + hash;
}
export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(pw, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(calc, "hex"));
}

/* ---------- session tokens (HMAC-signed, stored in an httpOnly cookie) ---------- */
export function signToken(payload, days = 30) {
  const body = { ...payload, exp: Date.now() + days * 86400000 };
  const p = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(p).digest("base64url");
  return p + "." + sig;
}
export function verifyToken(tok) {
  if (!tok || typeof tok !== "string") return null;
  const [p, sig] = tok.split(".");
  if (!p || !sig) return null;
  const want = crypto.createHmac("sha256", SECRET).update(p).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(p, "base64url").toString());
    if (!body.exp || body.exp < Date.now()) return null;
    return body;
  } catch (e) { return null; }
}

/* ---------- cookies + current user ---------- */
const COOKIE = "ct_auth";
export function getCookie(req, name) {
  const m = String(req.headers.cookie || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}
export function setAuthCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`);
}
export function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
// Role is re-read from the store on every request, so promotions/demotions
// take effect immediately without re-login. Env admins can never be demoted.
export async function currentUser(req) {
  const t = verifyToken(getCookie(req, COOKIE));
  if (!t || !t.e) return null;
  const u = await kvGet(userKey(t.e));
  if (!u) return null;
  if (isEnvAdmin(u.email)) u.role = "admin";
  return u;
}

/* ---------- misc ---------- */
export function readBody(req) {
  const b = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch (e) { return null; } })() : req.body;
  return b && typeof b === "object" ? b : {};
}
export function publicUser(u) {
  return u ? { email: u.email, name: u.name, role: u.role } : null;
}
export function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || "ip").split(",")[0].trim();
}
