import { NextRequest, NextResponse } from "next/server";
import { createCase } from "@/lib/pipeline";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { input } = await req.json().catch(() => ({ input: "" }));
  if (typeof input !== "string" || input.trim().length < 3) {
    return NextResponse.json({ error: "Paste a scam link, UPI ID, phone number or message." }, { status: 400 });
  }
  if (!process.env.TINYFISH_API_KEY) {
    return NextResponse.json(
      { error: "TINYFISH_API_KEY is not set. Copy .env.example to .env.local and add your key." },
      { status: 500 },
    );
  }
  const state = createCase(input.trim());
  return NextResponse.json({ id: state.id });
}
