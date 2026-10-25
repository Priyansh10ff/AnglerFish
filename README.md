# Anglerfish

AI agents that bait scammers back. Paste a scam link / UPI ID / phone / WhatsApp forward →
TinyFish agents investigate it in isolated remote browsers → evidence dossier + pre-filled
cybercrime.gov.in complaint.

Team Slytherinnn · Swim with TinyFish, SST.

## Run

```bash
npm install
cp .env.example .env.local   # add your TINYFISH_API_KEY
npm run dev                  # http://localhost:3000
```

Get a key at https://docs.tinyfish.ai/authentication.

## How it works

1. `POST /api/cases` creates a case and kicks off the pipeline (`lib/pipeline.ts`).
2. **Recon** and **Bait** run in parallel via TinyFish `/run-sse` (`lib/tinyfish.ts`),
   streaming progress and a live browser `streaming_url` into the case state.
3. **Mapper** takes the UPI IDs / phones / handles those agents extract, runs TinyFish
   Search for each, then Fetch-verifies the candidate pages share an identifier.
4. The browser subscribes to `GET /api/cases/:id/events` (SSE) and renders live sessions,
   extracted evidence, and the campaign graph. `/case/:id/report` builds the dossier +
   complaint (printable to PDF).

## Safety (enforced in prompts, `lib/prompts.ts`)

Observe and report only. Fake test identity only — never real names, numbers, cards or OTPs.
Never download/install/run anything. The user submits the complaint themselves (OTP login).

## Proxy note

The event brief says TinyFish proxies cover US/GB/CA/DE/FR/JP/AU. Indian scam sites may blank
non-Indian IPs — `TINYFISH_PROXY_COUNTRY=IN` is tried first; test this early, it decides the project.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · @xyflow/react · in-memory store
(swap `lib/store.ts` for Supabase to persist cases).
