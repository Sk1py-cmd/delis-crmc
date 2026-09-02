import { NextRequest, NextResponse } from "next/server";
import { search } from "@/server/queries";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getSessionUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ hits: [] });
  const hits = await search(q.trim());
  return NextResponse.json({ hits });
}
