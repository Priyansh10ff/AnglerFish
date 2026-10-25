// Mock TinyFish API for local/CI testing without a key or network.
// Emulates: POST /v1/automation/run-sse, GET / (search), POST / (fetch).
// Scenario is chosen from the target URL / query:
//   contains "legit"   -> recon clears the site (no bait expected)
//   contains "blocked" -> run fails with SITE_BLOCKED
//   anything else      -> scam result with identifiers
//
//   node mock/tinyfish.mjs            # listens on 4010
//   TINYFISH_AGENT_BASE=http://localhost:4010/v1 TINYFISH_SEARCH_BASE=http://localhost:4010/search \
//   TINYFISH_FETCH_BASE=http://localhost:4010/fetch TINYFISH_API_KEY=mock npm run dev

import http from "node:http";

const PORT = Number(process.env.MOCK_PORT || 4010);
const DELAY = Number(process.env.MOCK_DELAY_MS || 400); // per-event pause so SSE/UI can be observed

const SCAM_IDS = {
  upi_ids: ["quickloan.pay@ybl", "kycupdate@paytm"],
  phone_numbers: ["9123456780"],
  telegram_handles: ["@quickl0an_support"],
  emails: ["support@quick-loan-approval.co"],
  bank_accounts: [],
  other_urls: ["https://quick-loan-approval.co/pay", "https://kyc-sbi-update.top/verify"],
};

function scenario(url = "") {
  const u = url.toLowerCase();
  if (u.includes("legit")) return "legit";
  if (u.includes("blocked")) return "blocked";
  return "scam";
}

function reconResult(s) {
  if (s === "legit")
    return {
      is_scam: false,
      confidence: "high",
      verdict_reason: "Genuine company site: consistent branding, no payment requests, no impersonation.",
      brand_impersonated: "",
      scam_type: "",
      page_summary: "A legitimate SaaS product website with pricing, docs and a contact form.",
      upi_ids: [], phone_numbers: [], telegram_handles: [], emails: ["contact@example-legit.com"], bank_accounts: [], other_urls: [],
    };
  return {
    is_scam: true,
    confidence: "high",
    verdict_reason: "Impersonates a bank, demands an 'approval fee' via personal UPI ID, urgency language, no company details.",
    brand_impersonated: "State Bank of India",
    scam_type: "instant loan approval fee scam",
    page_summary: "Promises an instant pre-approved loan; collects name/phone then demands a ₹499 processing fee to a personal UPI ID.",
    ...SCAM_IDS,
  };
}

function baitResult() {
  return {
    form_found: true,
    next_page_summary: "After submitting the fake lead, a payment page appeared with a UPI QR for ₹499 and a WhatsApp 'loan officer' number.",
    payment_requested: "₹499 processing fee to quickloan.pay@ybl",
    upi_ids: ["quickloan.pay@ybl"],
    phone_numbers: ["9123456780", "9988776655"],
    telegram_handles: ["@quickl0an_support"],
    emails: [],
    bank_accounts: [],
    other_urls: ["https://quick-loan-approval.co/pay"],
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sse(req, res, body) {
  const s = scenario(body.url);
  const isBait = /lead-capture form|fill it with EXACTLY/i.test(body.goal || "");
  const runId = "mock_" + Math.random().toString(36).slice(2, 10);
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  const send = (o) => res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString(), ...o })}\n\n`);

  send({ type: "STARTED", run_id: runId });
  await sleep(DELAY);
  send({ type: "STREAMING_URL", run_id: runId, streaming_url: `http://localhost:${PORT}/viewer/${runId}` });
  for (const purpose of isBait
    ? ["Locating lead-capture form", "Filling form with fake test identity", "Submitting and observing next page"]
    : ["Loading page in isolated browser", "Assessing for fraud indicators", "Extracting identifiers"]) {
    await sleep(DELAY);
    send({ type: "PROGRESS", run_id: runId, purpose });
  }
  await sleep(DELAY);
  if (s === "blocked") {
    send({ type: "COMPLETE", run_id: runId, status: "FAILED", error: { code: "SITE_BLOCKED", message: "Target site blocked the remote browser (geo/anti-bot)." } });
  } else {
    send({ type: "COMPLETE", run_id: runId, status: "COMPLETED", result: isBait ? baitResult() : reconResult(s) });
  }
  res.end();
}

function search(query) {
  const q = decodeURIComponent(query || "").replace(/"/g, "");
  const hit = Object.values(SCAM_IDS).flat().some((v) => v.toLowerCase() === q.toLowerCase());
  if (!hit) return { query: q, results: [], total_results: 0, page: 0 };
  return {
    query: q,
    page: 0,
    total_results: 2,
    results: [
      { position: 1, site_name: "kyc-sbi-update.top", title: "SBI KYC Update - Verify Now", snippet: `Pay verification fee to ${q}`, url: "https://kyc-sbi-update.top/verify" },
      { position: 2, site_name: "reddit.com", title: "Scam alert: fake loan site", snippet: `They asked me to pay to ${q} — do not pay.`, url: "https://www.reddit.com/r/india/comments/x1/scam_alert" },
    ],
  };
}

function fetchPages(urls) {
  return {
    results: urls.map((url) => ({
      url, final_url: url, title: url.includes("kyc") ? "SBI KYC Update - Verify Now" : "Scam alert: fake loan site",
      description: null, language: "en", author: null, published_date: null,
      text: `# Page\nPay the fee to quickloan.pay@ybl or call 9123456780. Telegram @quickl0an_support.`,
      links: [], latency_ms: 120, format: "markdown",
    })),
    errors: [],
  };
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let raw = "";
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    const json = (o, code = 200) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };

    if (url.pathname.endsWith("/automation/run-sse")) return sse(req, res, body);
    if (url.pathname.startsWith("/search")) return json(search(url.searchParams.get("query")));
    if (url.pathname.startsWith("/fetch")) return json(fetchPages(body.urls || []));
    if (url.pathname.startsWith("/viewer/")) { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(`<body style="background:#111;color:#0f0;font-family:monospace;padding:20px">mock live browser · ${url.pathname.split("/").pop()}</body>`); }
    json({ error: "unknown mock route " + url.pathname }, 404);
  })
  .listen(PORT, () => console.log(`mock tinyfish on :${PORT}`));
