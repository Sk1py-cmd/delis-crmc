import { NextRequest, NextResponse } from "next/server";
import { addMessage, getMessages, markThreadRead } from "@/server/queries";
import { requireApiAccess } from "@/server/apiGuard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Переписка с клиентами — не публичные данные.
  const guard = await requireApiAccess("/chat");
  if (!guard.ok) return guard.response;

  const id = Number(req.nextUrl.searchParams.get("customerId") ?? 0);
  if (!id) return NextResponse.json({ messages: [] });
  const messages = await getMessages(id);
  await markThreadRead(id);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiAccess("/chat");
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as { customerId: number; body: string; kind?: string };
  if (!body.customerId || !body.body?.trim()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const message = await addMessage(body.customerId, body.body.trim(), true, body.kind ?? "text");
  return NextResponse.json({ message });
}
