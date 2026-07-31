import { NextRequest, NextResponse } from "next/server";
import { getAgentMessages, sendAgentMessage } from "@/server/queries";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const agentId = Number(req.nextUrl.searchParams.get("agentId") ?? 0);
  if (!agentId) return NextResponse.json({ messages: [] });

  const messages = await getAgentMessages(agentId);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { agentId: number; body: string };
  if (!body.agentId || !body.body?.trim()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const message = await sendAgentMessage(body.agentId, body.body.trim(), true);
  return NextResponse.json({ message });
}
