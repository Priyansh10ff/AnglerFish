// Proxies TinyFish step screenshots so the API key never reaches the browser.
// Only URLs on the TinyFish agent host are allowed (no open proxy).
import { NextRequest } from "next/server";
import { isTinyFishAssetUrl, tinyfishApiKey } from "@/lib/tinyfish";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  if (!isTinyFishAssetUrl(u)) return new Response("forbidden", { status: 403 });

  const upstream = await fetch(u, { headers: { "X-API-Key": tinyfishApiKey() } });
  if (!upstream.ok || !upstream.body) return new Response("upstream error", { status: 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
