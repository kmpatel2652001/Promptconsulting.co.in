// Vercel serverless function: IFRS 16 executive audit note.
// Receives the COMPUTED working (inputs as confirmed by the accountant plus
// the engine's calculated figures) and asks Claude to draft the narrative.
// The model describes numbers it was given — it never calculates them.
// Requires ANTHROPIC_API_KEY in the Vercel project environment.

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.IFRS16_MODEL || "claude-opus-4-8";

const SYSTEM_PROMPT = `You are drafting an executive accounting memorandum for an IFRS 16 lease working prepared by a professional accountant in the UAE.
You are given a JSON payload containing the confirmed lease inputs and the figures computed by a deterministic calculation engine.

Write a clear, professional audit note in markdown with these sections:
## Executive summary
## Basis of measurement
## Key judgements
## Financial impact
## Journal entries overview

Hard rules:
- Every number you mention must appear verbatim in the payload. NEVER derive, recompute, round differently, or extrapolate a figure. If a figure you want is not in the payload, describe it qualitatively instead.
- State explicitly: lease payments are measured excluding VAT; fixed service charges are capitalised with the lease payments (non-lease components not separated); variable charges are expensed to profit or loss as incurred.
- Reference IFRS 16 requirements in plain language (initial measurement, subsequent measurement, and for subleases the classification by reference to the right-of-use asset).
- Keep it under 550 words. Formal but readable. No preamble before the first heading, no closing sign-off.`;

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!API_KEY) { res.status(503).json({ error: "narration not configured", detail: "Set ANTHROPIC_API_KEY in the Vercel project settings." }); return; }

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { res.status(400).json({ error: "bad json" }); return; }
  if (!body || typeof body.computed !== "object") { res.status(400).json({ error: "computed payload required" }); return; }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: "Draft the audit note for this computed IFRS 16 working:\n\n" + JSON.stringify(body.computed)
        }]
      })
    });
    const j = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: "model call failed", detail: j && j.error && j.error.message });
      return;
    }
    if (j.stop_reason === "refusal") {
      res.status(502).json({ error: "model declined" });
      return;
    }
    const note = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    res.status(200).json({ note, model: j.model });
  } catch (e) {
    res.status(500).json({ error: "narration failed", detail: String(e && e.message || e) });
  }
}
