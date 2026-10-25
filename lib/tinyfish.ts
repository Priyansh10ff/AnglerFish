// Thin TinyFish client. Docs: https://docs.tinyfish.ai
// Agent:  POST https://agent.tinyfish.ai/v1/automation/run-sse  (X-API-Key)
// Search: GET  https://api.search.tinyfish.ai?query=...
// Fetch:  POST https://api.fetch.tinyfish.ai

const AGENT_BASE = "https://agent.tinyfish.ai/v1";
const SEARCH_BASE = "https://api.search.tinyfish.ai";
const FETCH_BASE = "https://api.fetch.tinyfish.ai";

function apiKey(): string {
  const k = process.env.TINYFISH_API_KEY;
  if (!k) throw new Error("TINYFISH_API_KEY is not set (see .env.example)");
  return k;
}

export interface SseEvent {
  type: "STARTED" | "STREAMING_URL" | "PROGRESS" | "HEARTBEAT" | "COMPLETE";
  run_id?: string;
  streaming_url?: string;
  purpose?: string;
  status?: string;
  result?: unknown;
  error?: { code?: string; message?: string; help_message?: string };
  timestamp?: string;
}

export interface RunAgentOptions {
  url: string;
  goal: string;
  outputSchema?: object;
  onEvent: (e: SseEvent) => void;
}

/** Stream an agent run via /run-sse, invoking onEvent per parsed SSE event. */
export async function runAgentStream(opts: RunAgentOptions): Promise<void> {
  const body: Record<string, unknown> = {
    url: opts.url,
    goal: opts.goal,
    browser_profile: process.env.TINYFISH_BROWSER_PROFILE || "stealth",
    proxy_config: {
      enabled: true,
      type: "tinyfish",
      country_code: process.env.TINYFISH_PROXY_COUNTRY || "IN",
    },
    agent_config: { max_duration_seconds: 420 },
  };
  if (opts.outputSchema) body.output_schema = opts.outputSchema;

  const res = await fetch(`${AGENT_BASE}/automation/run-sse`, {
    method: "POST",
    headers: { "X-API-Key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`TinyFish run-sse ${res.status}: ${text.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line; data lines start with "data:"
    const frames = buf.split(/\r?\n\r?\n/);
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          opts.onEvent(JSON.parse(payload) as SseEvent);
        } catch {
          /* non-JSON keepalive — ignore */
        }
      }
    }
  }
}

export interface SearchResult {
  position: number;
  site_name: string;
  title: string;
  snippet: string;
  url: string;
}

export async function searchWeb(query: string, purpose?: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ query, location: "IN", language: "en" });
  if (purpose) params.set("purpose", purpose.slice(0, 2000));
  const res = await fetch(`${SEARCH_BASE}?${params}`, {
    headers: { "X-API-Key": apiKey() },
  });
  if (!res.ok) throw new Error(`TinyFish search ${res.status}`);
  const data = await res.json();
  return (data.results ?? []) as SearchResult[];
}

export interface FetchedPage {
  url: string;
  final_url: string;
  title: string | null;
  text: string | null;
  links?: string[];
}

export async function fetchUrls(urls: string[]): Promise<FetchedPage[]> {
  if (urls.length === 0) return [];
  const res = await fetch(FETCH_BASE, {
    method: "POST",
    headers: { "X-API-Key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: urls.slice(0, 10),
      format: "markdown",
      links: true,
      ttl: 0,
      per_url_timeout_ms: 30000,
      purpose: "Checking whether suspected scam pages share payment identifiers, for a fraud evidence report.",
    }),
  });
  if (!res.ok) throw new Error(`TinyFish fetch ${res.status}`);
  const data = await res.json();
  return (data.results ?? []) as FetchedPage[];
}
