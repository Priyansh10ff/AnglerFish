// SSE stream of full case state to the browser.
import { NextRequest } from "next/server";
import { getCase, subscribe } from "@/lib/store";
import type { CaseState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const initial = getCase(id);
  if (!initial) return new Response("case not found", { status: 404 });

  const encoder = new TextEncoder();
  let unsub: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (c: CaseState) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`));
          if (c.status !== "running") cleanup(() => controller.close());
        } catch {
          cleanup();
        }
      };
      const cleanup = (after?: () => void) => {
        unsub?.();
        unsub = null;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
        after?.();
      };
      send(initial);
      if (initial.status === "running") {
        unsub = subscribe(id, send);
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: hb\n\n`));
          } catch {
            cleanup();
          }
        }, 15000);
      }
    },
    cancel() {
      unsub?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
