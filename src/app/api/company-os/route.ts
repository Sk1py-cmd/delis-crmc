import { NextResponse } from "next/server";
import { getCompanyOS } from "@/server/queries";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
