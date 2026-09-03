import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAgentMessages, sendAgentMessage } from "@/server/queries";
import { requireApiAccess } from "@/server/apiGuard";
import { db } from "@/db";
import * as s from "@/db/schema";
import type { SessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Проверяет, что запрошенный диалог доступен пользователю.
 *
 * Раньше `agentId` брался из запроса без проверок, поэтому любой вошедший
 * читал переписку любого агента, а отправка шла с `fromAdmin: true` — то
 * есть агент мог написать коллеге от имени администрации. Проверено на
 * живом стенде.
 *
 * Роль `agent` работает только со своим диалогом (агент связан с
 * пользователем по email, так же как в портале агента). Остальным ролям
 * раздел `/agents` уже разрешён политикой, им доступны все диалоги.
 */
async function canUseThread(user: SessionUser, agentId: number): Promise<boolean> {
  if (user.role !== "agent") return true;

  const [own] = await db
    .select({ id: s.agents.id })
    .from(s.agents)
    .where(eq(s.agents.email, user.email))
    .limit(1);

  return Boolean(own) && own.id === agentId;
}

const forbidden = () =>
  NextResponse.json({ error: "Недостаточно прав для этого действия" }, { status: 403 });

export async function GET(req: NextRequest) {
  const guard = await requireApiAccess("/agents");
  if (!guard.ok) return guard.response;

  const agentId = Number(req.nextUrl.searchParams.get("agentId") ?? 0);
  if (!agentId) return NextResponse.json({ messages: [] });

  if (!(await canUseThread(guard.user, agentId))) return forbidden();

  const messages = await getAgentMessages(agentId);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiAccess("/agents");
  if (!guard.ok) return guard.response;

  const body = (await req.json()) as { agentId: number; body: string };
  if (!body.agentId || !body.body?.trim()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (!(await canUseThread(guard.user, body.agentId))) return forbidden();

  // fromAdmin выставляем по роли, а не по желанию клиента: иначе агент
  // отправляет сообщения от имени администрации.
  const fromAdmin = guard.user.role !== "agent";
  const message = await sendAgentMessage(body.agentId, body.body.trim(), fromAdmin);
  return NextResponse.json({ message });
}
