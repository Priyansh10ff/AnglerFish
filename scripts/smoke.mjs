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

// With SMOKE_ASSERT=1 (used in CI against the mock) verify behaviour, not just completion:
//   url containing "legit"   → verdict legit, no complaint, bait skipped
//   url containing "blocked" → recon failed but case done and a complaint still produced (fail-open)
//   everything else          → verdict scam/suspicious and a complaint produced
function check(r) {
  if (r.error) return [`did not complete: ${r.error}`];
  const problems = [];
  const u = r.input.toLowerCase();
  const hasComplaint = r.complaintFirstLine?.startsWith("COMPLAINT");
  if (u.includes("legit")) {
    if (r.verdict !== "legit") problems.push(`expected verdict legit, got ${r.verdict}`);
    if (hasComplaint) problems.push("complaint generated for a legit site");
    if (r.bait !== "done") problems.push(`bait should be skipped/done, got ${r.bait}`);
  } else if (u.includes("blocked")) {
    if (!r.recon.startsWith("failed")) problems.push(`expected recon failed, got ${r.recon}`);
    if (r.status !== "done") problems.push(`expected status done, got ${r.status}`);
    if (!hasComplaint) problems.push("blocked site should still fail open to a complaint");
  } else {
    if (!["scam", "suspicious"].includes(r.verdict)) problems.push(`unexpected verdict ${r.verdict}`);
    if (!hasComplaint) problems.push("no complaint generated");
    if (r.type === "url" || r.type === "message") {
      if (!r.upi.length && !r.phones.length) problems.push("scam page yielded no identifiers");
      if (r.related < 1) problems.push("mapper found no related sites");
    }
  }
  return problems;
}

let fail = 0;
for (const input of inputs) {
  const r = await run(input);
  const problems = process.env.SMOKE_ASSERT ? check(r) : r.error ? [r.error] : [];
  if (problems.length) fail++;
  console.log("\n" + "─".repeat(70));
  console.log(input);
  console.log(JSON.stringify(r, null, 2));
  for (const p of problems) console.log("  ✗ " + p);
}
console.log("\n" + (fail ? `${fail} case(s) FAILED` : "all cases passed"));
process.exit(fail ? 1 : 0);
