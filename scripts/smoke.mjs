// Smoke test: creates cases for a set of inputs against a running Anglerfish
// server and prints verdict + identifiers. Works against the mock or your real key.
//
//   npm run smoke                      # against http://localhost:3000
//   BASE=http://localhost:3000 node scripts/smoke.mjs "https://some-url" "upi@bank"

const BASE = process.env.BASE || "http://localhost:3000";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 8 * 60 * 1000);

const DEFAULT_INPUTS = [
  "quickloan-support@okaxis",
  "9876543210",
  "Congratulations! Your KYC is pending: https://kyc-sbi-update.top/verify or WhatsApp 9123456780",
  "https://quick-loan-approval.co/apply",
  "https://example-legit-saas.com/",
];

const inputs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_INPUTS;

async function run(input) {
  const t0 = Date.now();
  const created = await fetch(`${BASE}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  }).then((r) => r.json());
  if (!created.id) return { input, error: created.error ?? "create failed" };

  let c;
  for (;;) {
    c = await fetch(`${BASE}/api/cases/${created.id}`).then((r) => r.json());
    if (c.status !== "running") break;
    if (Date.now() - t0 > TIMEOUT_MS) return { input, id: created.id, error: "timeout" };
    await new Promise((r) => setTimeout(r, 2000));
  }
  const complaint = await fetch(`${BASE}/api/cases/${created.id}/complaint`).then((r) => r.json());
  const ids = (k) => [...new Set([...(c.recon.result?.[k] ?? []), ...(c.bait.result?.[k] ?? [])])];
  return {
    input,
    id: c.id,
    secs: Math.round((Date.now() - t0) / 1000),
    type: c.inputType,
    verdict: c.verdict,
    status: c.status,
    recon: c.recon.status + (c.recon.error ? ` (${c.recon.error})` : ""),
    bait: c.bait.status + (c.bait.error ? ` (${c.bait.error})` : ""),
    mapper: c.mapper.status,
    streaming: Boolean(c.recon.streamingUrl),
    upi: ids("upi_ids"),
    phones: ids("phone_numbers"),
    related: c.mapper.sites.length,
    complaintFirstLine: complaint.text?.split("\n")[0],
  };
}

let fail = 0;
for (const input of inputs) {
  const r = await run(input);
  if (r.error) fail++;
  console.log("\n" + "─".repeat(70));
  console.log(input);
  console.log(JSON.stringify(r, null, 2));
}
console.log("\n" + (fail ? `${fail} case(s) failed to complete` : "all cases completed"));
process.exit(fail ? 1 : 0);
