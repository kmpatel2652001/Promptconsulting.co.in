// Vercel serverless function: IFRS 16 lease-contract extraction.
// Receives a base64 PDF, asks Claude to extract the financial variables as
// strict JSON (structured outputs), and returns them for the review screen.
// Requires ANTHROPIC_API_KEY in the Vercel project environment.
// The LLM only reads the contract — it never performs any calculation.

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.IFRS16_MODEL || "claude-opus-4-8";

// Every field is required with a zero/empty default so the response always
// parses; genuinely-unknown values are listed in uncertain_fields instead.
const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    lessor: { type: "string" },
    lessee: { type: "string" },
    premises: { type: "string" },
    currency: { type: "string", description: "ISO code, e.g. AED" },
    commencement_date: { type: "string", description: "YYYY-MM-DD, empty string if not stated" },
    term_months: { type: "integer", description: "Non-cancellable term in months; 0 if unclear" },
    payment_frequency: { type: "string", enum: ["monthly", "quarterly", "annual"] },
    payment_timing: { type: "string", enum: ["advance", "arrears"] },
    base_rent_per_period: { type: "number", description: "Base rent per payment period, exactly as stated in the contract" },
    rents_quoted_incl_vat: { type: "boolean", description: "true if the stated rent figures include VAT" },
    vat_rate_pct: { type: "number" },
    rent_free_periods: { type: "integer", description: "Number of initial payment periods that are rent-free" },
    escalation_pct_annual: { type: "number", description: "Fixed annual escalation percentage; 0 if none or if index/CPI-linked" },
    escalation_is_index_linked: { type: "boolean", description: "true if escalation is CPI/index-linked rather than a fixed %" },
    fixed_service_charge_per_period: { type: "number", description: "Fixed service/facility charges per payment period, as stated" },
    variable_charges_description: { type: "string", description: "Utilities, usage-based or %-of-sales charges, described briefly" },
    variable_charge_estimate_per_period: { type: "number", description: "Estimated variable charges per period if the contract implies one; else 0" },
    initial_direct_costs: { type: "number", description: "Broker fees, registration (e.g. Ejari), legal costs if stated" },
    lease_incentives: { type: "number" },
    restoration_cost_estimate: { type: "number", description: "Reinstatement/restoration obligation estimate if stated" },
    security_deposit: { type: "number" },
    extension_options: { type: "string", description: "Renewal/extension option terms, verbatim summary; empty if none" },
    termination_options: { type: "string" },
    purchase_option: { type: "string" },
    rate_implicit_pct: { type: "number", description: "Interest rate implicit in the lease if determinable from the contract; 0 if not" },
    arrangement_type: { type: "string", enum: ["standalone", "co_lease", "sub_lease"] },
    co_lessees: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          share_pct: { type: "number" }
        },
        required: ["name", "share_pct"]
      }
    },
    sublease_terms: { type: "string", description: "If the contract permits or contains a sublease: subtenant, rent, term. Empty if none." },
    uncertain_fields: {
      type: "array", items: { type: "string" },
      description: "Field names above whose value is a default because the contract does not state it, or where the reading is uncertain"
    },
    source_notes: { type: "string", description: "Clause/page references for the key figures, e.g. 'Rent: cl.4.1 p.3; Term: cl.2 p.2'" }
  },
  required: [
    "lessor","lessee","premises","currency","commencement_date","term_months",
    "payment_frequency","payment_timing","base_rent_per_period","rents_quoted_incl_vat",
    "vat_rate_pct","rent_free_periods","escalation_pct_annual","escalation_is_index_linked",
    "fixed_service_charge_per_period","variable_charges_description","variable_charge_estimate_per_period",
    "initial_direct_costs","lease_incentives","restoration_cost_estimate","security_deposit",
    "extension_options","termination_options","purchase_option","rate_implicit_pct",
    "arrangement_type","co_lessees","sublease_terms","uncertain_fields","source_notes"
  ]
};

const SYSTEM_PROMPT = `You are an IFRS 16 lease-data extraction engine for a professional accounting tool.
Read the lease contract and fill the JSON schema with values EXACTLY as stated in the document.
Rules:
- Never invent, estimate, or calculate a value the contract does not state. Use 0 / "" / false and add the field name to uncertain_fields.
- Report money figures exactly as written (do not convert VAT-inclusive amounts — just set rents_quoted_incl_vat correctly).
- Do not perform any arithmetic beyond restating figures that appear in the contract.
- base_rent_per_period and fixed_service_charge_per_period must match payment_frequency (e.g. if rent is stated annually but paid quarterly, frequency is quarterly and the per-period amount is the quarterly instalment ONLY if the contract states it; otherwise report the stated figure with its stated frequency and note the mismatch in source_notes and uncertain_fields).
- In source_notes cite the clause/page for every key figure so an accountant can verify quickly.`;

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!API_KEY) { res.status(503).json({ error: "extraction not configured", detail: "Set ANTHROPIC_API_KEY in the Vercel project settings." }); return; }

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch { res.status(400).json({ error: "bad json" }); return; }
  const pdf = body && body.pdf_base64;
  if (!pdf || typeof pdf !== "string") { res.status(400).json({ error: "pdf_base64 required" }); return; }

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
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: "json_schema", schema: EXTRACTION_SCHEMA } },
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
            { type: "text", text: "Extract the IFRS 16 variables from this lease contract." }
          ]
        }]
      })
    });
    const j = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: "model call failed", detail: j && j.error && j.error.message });
      return;
    }
    if (j.stop_reason === "refusal") {
      res.status(502).json({ error: "model declined the document" });
      return;
    }
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    res.status(200).json({ extraction: JSON.parse(text), model: j.model });
  } catch (e) {
    res.status(500).json({ error: "extraction failed", detail: String(e && e.message || e) });
  }
}
