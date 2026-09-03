import { NextRequest, NextResponse } from "next/server";
import { search } from "@/server/queries";
import { requireApiAuth } from "@/server/apiGuard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Раздела у поиска нет — он сквозной, поэтому проверяем только вход,
  // а выдачу фильтруем по роли внутри search().
  const guard = await requireApiAuth();
  if (!guard.ok) return guard.response;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ hits: [] });
  const hits = await search(q.trim(), guard.user.role);
  return NextResponse.json({ hits });
}
