// Case pipeline: recon + bait in parallel, then campaign mapper on the
// identifiers they extract. All TinyFish calls happen server-side.
import { randomUUID } from "crypto";
import { runAgentStream, searchWeb, fetchUrls } from "./tinyfish";
import { RECON_GOAL, baitGoal, RECON_SCHEMA, BAIT_SCHEMA } from "./prompts";
import { putCase, updateCase, getCase } from "./store";
import type {
  CaseState,
  InputType,
  ReconResult,
  BaitResult,
  RelatedSite,
} from "./types";

export function detectInputType(raw: string): { type: InputType; targetUrl: string | null } {
  const input = raw.trim();
  if (/^https?:\/\/\S+$/i.test(input)) return { type: "url", targetUrl: input };
  if (/^[a-z0-9._-]{2,}@[a-z]{2,}$/i.test(input)) return { type: "upi", targetUrl: null };
  if (/^(\+?91[\s-]?)?[6-9]\d{9}$/.test(input.replace(/\s/g, ""))) return { type: "phone", targetUrl: null };
  // forwarded message — pull the first URL out of it if present
  const m = input.match(/https?:\/\/\S+/i);
  return { type: "message", targetUrl: m ? m[0].replace(/[),.]+$/, "") : null };
}

const emptyAgent = <T>() => ({
  status: "idle" as const,
  runId: null,
  streamingUrl: null,
  progress: [] as string[],
  result: null as T | null,
  error: null,
});

export function createCase(input: string): CaseState {
  const { type, targetUrl } = detectInputType(input);
  const state: CaseState = {
    id: randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    input,
    inputType: type,
    targetUrl,
    status: "running",
    verdict: "pending",
    recon: emptyAgent<ReconResult>(),
    bait: emptyAgent<BaitResult>(),
    mapper: { status: "idle", progress: [], sites: [], error: null },
  };
  putCase(state);
  void runPipeline(state.id);
  return state;
}

async function runPipeline(id: string): Promise<void> {
  const c = getCase(id);
  if (!c) return;

  if (c.targetUrl) {
    // 1. Recon first — it decides whether this is worth baiting at all.
    await runBrowserAgent(id, "recon", c.targetUrl, RECON_GOAL, RECON_SCHEMA);
    const verdict = deriveVerdict(getCase(id)!);
    updateCase(id, (s) => void (s.verdict = verdict));

    if (verdict === "legit") {
      // Never submit fake leads to a real business's form.
      updateCase(id, (s) => {
        s.bait.status = "done";
        s.bait.progress.push("Recon cleared this site as legitimate — bait skipped.");
        s.mapper.status = "done";
        s.mapper.progress.push("Legitimate site — campaign mapping skipped.");
        s.status = "done";
      });
      return;
    }

    // 2. Bait only once recon says scam / suspicious.
    await runBrowserAgent(id, "bait", c.targetUrl, baitGoal(), BAIT_SCHEMA);
  } else {
    // Bare UPI / phone: nothing to browse, treat as reported-suspicious and map it.
    updateCase(id, (s) => {
      s.verdict = "suspicious";
      s.recon.status = "done";
      s.bait.status = "done";
      s.recon.progress.push("No URL in input — browser agents skipped, mapping identifier directly.");
    });
  }

  // 3. Campaign map on whatever identifiers we now have.
  await runMapper(id);

  updateCase(id, (s) => {
    const failed =
      s.recon.status === "failed" && s.bait.status === "failed" && s.mapper.status === "failed";
    s.status = failed ? "failed" : "done";
  });
}

/** Turn recon's structured answer into a case verdict. Fails open to "suspicious". */
function deriveVerdict(c: CaseState): CaseState["verdict"] {
  const r = c.recon.result;
  if (!r || c.recon.status !== "done") return "suspicious";
  if (r.is_scam === true) return "scam";
  if (r.is_scam === false && (r.confidence === "high" || r.confidence === "medium")) return "legit";
  return "suspicious";
}

async function runBrowserAgent(
  id: string,
  which: "recon" | "bait",
  url: string,
  goal: string,
  schema: object,
): Promise<void> {
  updateCase(id, (s) => void (s[which].status = "starting"));
  try {
    await runAgentStream({
      url,
      goal,
      outputSchema: schema,
      onEvent: (e) => {
        updateCase(id, (s) => {
          const a = s[which];
          if (e.type === "STARTED") {
            a.status = "running";
            a.runId = e.run_id ?? null;
          } else if (e.type === "STREAMING_URL") {
            a.streamingUrl = e.streaming_url ?? null;
          } else if (e.type === "PROGRESS" && e.purpose) {
            a.progress.push(e.purpose);
            if (a.progress.length > 30) a.progress.shift();
          } else if (e.type === "COMPLETE") {
            if (e.status === "COMPLETED") {
              a.status = "done";
              a.result = normalizeResult(e.result) as never;
            } else {
              a.status = "failed";
              a.error = e.error?.message ?? e.status ?? "run failed";
            }
          }
        });
      },
    });
    // stream ended without COMPLETE → mark failed if still running
    updateCase(id, (s) => {
      if (s[which].status === "running" || s[which].status === "starting") {
        s[which].status = "failed";
        s[which].error = "stream ended without a result";
      }
    });
  } catch (err) {
    updateCase(id, (s) => {
      s[which].status = "failed";
      s[which].error = err instanceof Error ? err.message : String(err);
    });
  }
}

/** TinyFish returns objects directly in result; lists/strings under result.result. */
function normalizeResult(r: unknown): unknown {
  if (r && typeof r === "object" && "result" in (r as Record<string, unknown>)) {
    const inner = (r as Record<string, unknown>).result;
    if (inner && typeof inner === "object") return inner;
  }
  return r;
}

function collectIdentifiers(c: CaseState): string[] {
  const ids = new Set<string>();
  for (const res of [c.recon.result, c.bait.result]) {
    if (!res) continue;
    for (const key of ["upi_ids", "phone_numbers", "telegram_handles"] as const) {
      for (const v of res[key] ?? []) if (v && v.length > 3) ids.add(v.trim());
    }
  }
  if (c.inputType === "upi" || c.inputType === "phone") ids.add(c.input.trim());
  return [...ids].slice(0, 6);
}

async function runMapper(id: string): Promise<void> {
  const c = getCase(id);
  if (!c) return;
  const identifiers = collectIdentifiers(c);
  if (identifiers.length === 0) {
    updateCase(id, (s) => {
      s.mapper.status = "done";
      s.mapper.progress.push("No identifiers extracted to map.");
    });
    return;
  }

  updateCase(id, (s) => void (s.mapper.status = "running"));
  try {
    const targetHost = c.targetUrl ? safeHost(c.targetUrl) : null;
    const candidates = new Map<string, RelatedSite>();

    for (const ident of identifiers) {
      updateCase(id, (s) => void s.mapper.progress.push(`Searching for "${ident}"…`));
      const results = await searchWeb(
        `"${ident}"`,
        "Finding other websites and complaint reports that mention a payment identifier used by a suspected scam, to map the operation for a fraud report.",
      ).catch(() => []);
      for (const r of results.slice(0, 5)) {
        const host = safeHost(r.url);
        if (!host || host === targetHost) continue;
        const existing = candidates.get(r.url);
        if (existing) {
          if (!existing.matchedOn.includes(ident)) existing.matchedOn.push(ident);
        } else {
          candidates.set(r.url, {
            url: r.url,
            title: r.title ?? null,
            matchedOn: [ident],
            snippet: r.snippet ?? null,
            source: "search",
          });
        }
      }
    }

    // Verify the strongest candidates by fetching them and re-checking identifiers.
    const toVerify = [...candidates.values()].slice(0, 10);
    if (toVerify.length > 0) {
      updateCase(id, (s) =>
        void s.mapper.progress.push(`Verifying ${toVerify.length} candidate page(s)…`),
      );
      const pages = await fetchUrls(toVerify.map((s) => s.url)).catch(() => []);
      for (const p of pages) {
        const site = candidates.get(p.url);
        if (!site || typeof p.text !== "string") continue;
        const confirmed = identifiers.filter((i) =>
          p.text!.toLowerCase().includes(i.toLowerCase()),
        );
        if (confirmed.length > 0) {
          site.matchedOn = [...new Set([...site.matchedOn, ...confirmed])];
          site.source = "fetch";
          if (p.title) site.title = p.title;
        }
      }
    }

    updateCase(id, (s) => {
      s.mapper.sites = [...candidates.values()];
      s.mapper.status = "done";
      s.mapper.progress.push(`Found ${candidates.size} related page(s).`);
    });
  } catch (err) {
    updateCase(id, (s) => {
      s.mapper.status = "failed";
      s.mapper.error = err instanceof Error ? err.message : String(err);
    });
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
