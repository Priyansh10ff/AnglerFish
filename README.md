<div align="center">

# Anglerfish

**AI agents that bait scammers back.**

Paste a scam link, UPI ID, phone number or forwarded WhatsApp message.<br>
TinyFish web agents investigate it in an isolated browser and hand back an evidence dossier<br>
and a pre-filled <a href="https://cybercrime.gov.in">cybercrime.gov.in</a> complaint, in about two minutes.

<br>

[![CI](https://github.com/Priyansh10ff/AnglerFish/actions/workflows/ci.yml/badge.svg)](https://github.com/Priyansh10ff/AnglerFish/actions/workflows/ci.yml)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TinyFish](https://img.shields.io/badge/powered%20by-TinyFish-0a7c6a)](https://docs.tinyfish.ai)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

<br>

<img src="docs/screenshots/case.png" width="860" alt="A scam case in Anglerfish: verdict banner, live recon and bait sessions with step screenshots, extracted identifiers, campaign graph">

<br><br>

<sub>Built by <b>Team Slytherinnn</b> (<a href="https://github.com/Priyansh10ff">Priyansh Dugar</a> · <a href="https://github.com/VikramPurohit358">Vikram J Purohit</a> · Ayush Saini) for Swim with TinyFish, Scaler School of Technology.</sub>

</div>

<br>

## Contents

- [Why](#why)
- [How it works](#how-it-works)
- [Screens](#screens)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Safety](#safety)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [License](#license)
- [Built by](#built-by)

<br>

## Why

Indians lost about ₹19,813 crore to cyber fraud in 2025 across 21.7 lakh complaints. A victim can block the number; the scam site stays live and returns on new domains. Filing a report that police or a bank can act on needs evidence: screenshots, payment identifiers, related domains. Nobody should collect that by hand from a hostile page.

Anglerfish collects it in a browser the scammer can't touch, and only after confirming the page is actually a scam.

<br>

## How it works

| # | Agent | What happens |
|:-:|:------|:-------------|
| 1 | **Recon** | Opens the page in an isolated TinyFish browser. Decides whether it's a scam, records every step with screenshots, extracts UPI IDs, phones, Telegram handles, emails and bank accounts. |
| 2 | **Bait** | *Runs only if recon flags the site.* Fills the lead form with an obviously fake identity, submits, and records the hidden payment step and contacts victims only see after they're hooked. |
| 3 | **Mapper** | TinyFish Search for every identifier found, then Fetch-verifies candidate pages actually contain it. Builds the campaign graph. |
| 4 | **Report** | Evidence dossier (identifiers, step screenshots, related sites) and a pre-filled complaint, printable to PDF. The user submits it themselves; the portal needs an OTP login. |

A site that recon clears as legitimate gets an assessment, not a complaint. Bait and mapping are skipped, so no fake data ever reaches a real business.

<br>

## Screens

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/home.png" alt="Home: paste a scam"></td>
    <td width="50%"><img src="docs/screenshots/legit.png" alt="A legitimate site: recon clears it, bait never runs, no complaint"></td>
  </tr>
  <tr>
    <td align="center"><sub>Paste a link, UPI ID, phone number or WhatsApp forward.</sub></td>
    <td align="center"><sub>Legitimate site: assessment only. Bait and the complaint are gated on recon's verdict.</sub></td>
  </tr>
</table>

<details>
<summary><b>Evidence dossier</b> with step-by-step browser screenshots and the complaint text</summary>
<br>
<img src="docs/screenshots/report.png" width="860" alt="Dossier: suspect, identifiers, screenshot gallery from the isolated browser, related sites, complaint">
</details>

<sub>Screenshots are from the bundled mock scenario (`npm run mock`). Real runs embed TinyFish's live `streaming_url` and the agent's own step screenshots.</sub>

<br>

## Quick start

Requires Node 18+ and a TinyFish API key ([get one here](https://docs.tinyfish.ai/authentication)).

```bash
git clone https://github.com/Priyansh10ff/AnglerFish.git
cd AnglerFish
npm install
cp .env.example .env        # add your TINYFISH_API_KEY
npm run dev                 # http://localhost:3000
```

> **Keep one env file.** Next.js loads `.env.local` *over* `.env`. A leftover placeholder in `.env.local` will shadow your real key and every run will return `401 INVALID_API_KEY`.

<br>

## Configuration

| Variable | Default | Description |
|:---------|:--------|:------------|
| `TINYFISH_API_KEY` | — | **Required.** |
| `TINYFISH_PROXY_COUNTRY` | `IN` | ISO country for the agent's proxy. Indian scam sites often blank non-Indian IPs. Fall back to `US` if `IN` isn't available on your plan. |
| `TINYFISH_BROWSER_PROFILE` | `stealth` | `lite` is cheaper; `stealth` survives more anti-bot. |
| `TINYFISH_AGENT_BASE` | `https://agent.tinyfish.ai/v1` | Override to point at the mock. |
| `TINYFISH_SEARCH_BASE` | `https://api.search.tinyfish.ai` | Override to point at the mock. |
| `TINYFISH_FETCH_BASE` | `https://api.fetch.tinyfish.ai` | Override to point at the mock. |

<br>

## Testing

### Without a key

A scenario-driven mock of all three TinyFish APIs ships in `mock/`. It picks a scenario from the URL: contains `legit` → cleared; contains `blocked` → `SITE_BLOCKED`; anything else → scam with identifiers and step screenshots.

```bash
npm run mock        # terminal 1: mock TinyFish on :4010
npm run dev:mock    # terminal 2 (macOS / Linux)
npm run smoke       # terminal 3: 5 inputs → verdict, agents, identifiers per case
```

On Windows, run `npm run mock`, then set `TINYFISH_API_KEY=mock` and the three `*_BASE` variables in `.env` and use `npm run dev`.

### Against your real key

```bash
npm run smoke
node scripts/smoke.mjs "https://suspicious.example/pay" "scamid@upi"   # your own inputs
```

### Assertions and CI

`SMOKE_ASSERT=1` turns the runner into a test: legit sites must produce no complaint, blocked sites must fail open, scam sites must yield identifiers and related pages. CI runs this against the mock on every push.

### Screenshots

```bash
npm i -D playwright && npx playwright install chromium
BASE=http://localhost:3000 npm run screenshots      # writes docs/screenshots/*.png
```

<br>

## Deployment

The case store is in-memory and agent runs take minutes after the HTTP response returns. This needs **one long-running Node process**, not serverless functions. Vercel's default function model will drop cases and kill pipelines mid-run.

### Render / Railway / Fly

| Setting | Value |
|:--------|:------|
| Build | `npm ci && npm run build` |
| Start | `npm start` |
| Env | `TINYFISH_API_KEY`, plus any overrides above |

`render.yaml` is included; Render picks it up as a blueprint.

### Docker

```bash
docker build -t anglerfish .
docker run -p 3000:3000 -e TINYFISH_API_KEY=sk-... anglerfish
```

For multi-instance or restart-safe hosting, swap `lib/store.ts` for Supabase. The interface is four functions.

<br>

## Safety

Enforced in the agent prompts (`lib/prompts.ts`) and the pipeline (`lib/pipeline.ts`).

- Observe and report only. Agents never attack, disrupt or exploit anything.
- Recon assesses first. A site it clears is never baited and gets no complaint.
- Only an obviously fake test identity is ever entered. Never real names, numbers, cards or OTPs. Never a payment.
- Nothing is downloaded, installed or run from a target site.
- All browsing happens inside TinyFish remote sessions, never on a user's or team member's device.
- Screenshot URLs are proxied server-side; the API key never reaches the browser.
- The user files the complaint themselves.

<br>

## Architecture

```
browser                     Next.js (one Node process)                       TinyFish
───────                     ──────────────────────────                       ────────
NewCase ─ POST /api/cases ─▶ createCase ─▶ store ─▶ runPipeline (detached)
                                                       │
CaseView ◀── SSE /api/cases/:id/events ◀── subscribe   ├─ recon ─────▶ /v1/automation/run-sse
  live iframe · evidence · graph                       │   verdict: scam | suspicious | legit
                                                       │   legit → stop (assessment only)
                                                       ├─ bait ──────▶ /v1/automation/run-sse
                                                       ├─ GET /v1/runs/:id?screenshots=url
                                                       ├─ mapper ────▶ Search API, Fetch API
                                                       └─ done
/case/:id/report ─ buildComplaint ─ print → PDF
/api/screenshot?u= ─ proxies TinyFish step images (host allow-listed)
```

Full detail, state machine and known limits: [ARCHITECTURE.md](./ARCHITECTURE.md).

<br>

## Project structure

```
app/
  page.tsx                     paste box
  case/[id]/page.tsx           live case view
  case/[id]/report/            dossier + complaint
  api/cases/                   create · read · SSE events · complaint text
  api/screenshot/route.ts      key-safe screenshot proxy
components/                    NewCase · CaseView · CampaignGraph · StepGallery · Masthead
lib/
  pipeline.ts                  input detection · orchestration · verdict · mapper
  tinyfish.ts                  Agent / Search / Fetch / Runs client
  prompts.ts                   agent goals · safety preamble · output schemas
  evidence.ts                  single merge point for identifiers
  complaint.ts                 complaint / assessment text
  store.ts                     in-memory case store (swap for Supabase)
mock/tinyfish.mjs              scenario-driven fake TinyFish
scripts/
  smoke.mjs                    end-to-end runner, optional assertions
  screenshots.mjs              headless README screenshots
docs/screenshots/              images used above
Dockerfile · render.yaml · .github/workflows/ci.yml
```

<br>

## Roadmap

| Stage | Scope |
|:------|:------|
| Now | Web app. Paste a scam → live investigation → dossier + complaint. |
| Next | WhatsApp bot: forward a scam message, get the dossier back in chat. |
| Then | De-duplicated feed of active UPI IDs, numbers and domain clusters for bank fraud teams and cybercrime cells. Regional languages. |

<br>

## License

MIT

<br>

## Built by

Team Slytherinnn, Scaler School of Technology

- [Priyansh Dugar](https://github.com/Priyansh10ff)
- [Vikram J Purohit](https://github.com/VikramPurohit358)
- [Ayush Saini](http://github.com/AyushSaini-SST)
