import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import {
  pushConfigured,
  removeSubscription,
  saveSubscription,
  vapidPublicKey,
} from "@/server/webpush";

export const dynamic = "force-dynamic";

/**
 * Управление браузерной push-подпиской текущего пользователя.
 *
 * GET  — публичный ключ VAPID и флаг, настроен ли push на сервере.
 * POST — `subscribe` (сохранить подписку) или `unsubscribe` (удалить).
 * Подписка всегда привязывается к вошедшему пользователю — чужую подписку
 * удалить нельзя.
 */

interface SubscribeBody {
  action: "subscribe" | "unsubscribe";
  subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
  endpoint?: string;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  return NextResponse.json({ enabled: pushConfigured(), publicKey: vapidPublicKey() });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = (await req.json()) as SubscribeBody;

  if (body.action === "subscribe") {
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: "Неполная подписка" }, { status: 400 });
    }
    await saveSubscription(user.id, sub);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unsubscribe") {
    const endpoint = body.endpoint ?? body.subscription?.endpoint;
    if (!endpoint) return NextResponse.json({ error: "Endpoint не указан" }, { status: 400 });
    await removeSubscription(user.id, endpoint);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
