# Architecture

```
 browser                      Next.js (one Node process)                    TinyFish
 ───────                      ──────────────────────────                    ────────
 NewCase ── POST /api/cases ─▶ createCase()
                               │  detectInputType()  url | upi | phone | message
                               │  putCase()  ──────────────▶ store (in-memory Map + subscribers)
                               └─ runPipeline()  (detached)
                                    │
 CaseView ◀── SSE /api/cases/:id/events ◀── store.subscribe()
   │                                 │
   │  live iframe(streaming_url)     ├─ 1. recon  ──▶ POST /v1/automation/run-sse  (stealth, proxy IN, output_schema)
   │  evidence table                 │       ◀── STARTED · STREAMING_URL · PROGRESS… · COMPLETE{result}
   │  campaign graph                 │     deriveVerdict()  → scam | suspicious | legit
   │                                 │     legit ──▶ stop. no bait, no mapper, assessment only.
   │                                 ├─ 2. bait   ──▶ run-sse (fake identity, submit form, record next page)
   │                                 ├─ 3. mapper ──▶ GET  api.search.tinyfish.ai?query="<identifier>"  per identifier
   │                                 │               POST api.fetch.tinyfish.ai {urls}  verify identifier present
   │                                 └─ status: done
   ▼
 /case/:id/report ── buildComplaint() ── print → PDF
```

## Modules

| File | Responsibility |
|---|---|
| `lib/types.ts` | `CaseState`, agent result shapes, `Verdict`. |
| `lib/prompts.ts` | Recon/bait goals, safety preamble, fake identity, JSON output schemas. |
| `lib/tinyfish.ts` | Thin HTTP client: `runAgentStream` (SSE parser), `searchWeb`, `fetchUrls`. Base URLs overridable for the mock. |
| `lib/pipeline.ts` | Input detection, case creation, orchestration, verdict derivation, mapper. |
| `lib/evidence.ts` | Single merge point for identifiers (recon + bait + typed input). Used by UI, graph and complaint. |
| `lib/complaint.ts` | Complaint / assessment text. |
| `lib/store.ts` | In-memory case map with pub/sub. Swap for Supabase here. |
| `app/api/cases/*` | Create, read, SSE stream, complaint text. |
| `components/*` | Input form, case view (sessions, verdict banner, evidence, graph), report. |
| `mock/tinyfish.mjs` | Scenario-driven fake of all three TinyFish APIs. |
| `scripts/smoke.mjs` | End-to-end smoke runner against any server (mock or real). |

## Case state machine

```
status:   running ─────────────────────────────▶ done | failed
verdict:  pending ──(recon COMPLETE)──▶ scam | suspicious | legit
                   (no URL input)   ──▶ suspicious
                   (recon failed)   ──▶ suspicious   (fail-open: still produce a dossier)
agents:   idle → starting → running → done | failed
```

Bait is skipped when verdict is `legit`, or when recon's error indicates the site blocked the browser (bait would be blocked identically).

## Where each TinyFish product is load-bearing

| Need | Product | Why not a scraper |
|---|---|---|
| Read hostile, JS-heavy, multi-step pages | Agent (`/run-sse`) | Needs a real browser; live `streaming_url` doubles as the demo view. |
| Reach the page behind the form | Agent + form filling | Victims only see the payment step after submitting. |
| Keep scam code off every team/user device | Remote browser session | Isolation is the product's safety guarantee. |
| Find sibling sites | Search API | Identifier-keyed web search. |
| Confirm they really share an identifier | Fetch API | Reads candidate pages at scale, cheaply. |
| Several agents on one case | Async / streaming runs | Recon, bait and mapper overlap where safe. |

## Deployment constraints

- Pipeline runs for minutes inside the server process after the POST returns → needs a long-lived process. Serverless freezes it.
- Store is per-process → one instance, or move state to Supabase (`lib/store.ts` interface: `putCase`, `getCase`, `updateCase`, `subscribe`).
- SSE route holds connections open for the life of a case; set proxy/idle timeouts ≥ 10 min.

## Known limits (MVP)

- Cases vanish on restart.
- Dossier "PDF" is browser print; no agent screenshots embedded yet (`capture_config` is the hook).
- Campaign map matches on identifiers only; template/hosting similarity not implemented.
- `streaming_url` embeddability depends on TinyFish's frame policy; an open-in-new-tab link is always shown.
