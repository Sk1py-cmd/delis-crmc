import { NextRequest, NextResponse } from "next/server";
import { search } from "@/server/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ hits: [] });
  const hits = await search(q.trim());
  return NextResponse.json({ hits });
}
