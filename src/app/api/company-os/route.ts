import { NextResponse } from "next/server";
import { getCompanyOS } from "@/server/queries";
import { requireApiAccess } from "@/server/apiGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  // Сводка содержит выручку за день — раздел доступен не всем ролям.
  const guard = await requireApiAccess("/company-os");
  if (!guard.ok) return guard.response;
  const os = await getCompanyOS();
  return NextResponse.json({
    ok: true,
    modules: os.modules,
    counts: os.counts,
    sync: os.sync.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      entity: e.entity,
      action: e.action,
      status: e.status,
      payload: e.payload,
      createdAt: e.createdAt,
    })),
  });
}
