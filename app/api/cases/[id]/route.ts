import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = getCase(id);
  if (!c) return NextResponse.json({ error: "case not found" }, { status: 404 });
  return NextResponse.json(c);
}
