import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import type { Locale } from "@/shared/i18n/locales";

/**
 * Браузерные push-уведомления (Web Push API, RFC 8030 + RFC 8291).
 *
 * Шифрование полезной нагрузки и подпись VAPID берёт на себя библиотека
 * `web-push` — это каноническая реализация протокола (её же советует
 * MDN); руками RFC 8291 не переписываем. Ключи VAPID генерируются один раз
 * (`npm run vapid:generate`) и кладутся в переменные окружения — они должны
 * быть стабильны между перезапусками и инстансами.
 */

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  /** Куда ведёт клик по уведомлению (относительный путь). */
  url?: string;
}

export function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

/** Публичный ключ VAPID — нужен браузеру для подписки. */
export function vapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

function ensureConfigured() {
  if (!pushConfigured()) {
    throw new Error(
      "Push-уведомления не настроены: задайте VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY и VAPID_SUBJECT",
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/** Сохраняет (или обновляет) подписку пользователя. Один браузер — одна строка. */
export async function saveSubscription(
  userId: number,
  sub: PushSubscriptionInput,
  lang?: string,
): Promise<void> {
  await ensureSeed();
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;
  const safeLang: Locale = lang === "uz" || lang === "en" || lang === "ru" ? lang : "ru";
  await db
    .insert(s.pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, lang: safeLang })
    .onConflictDoUpdate({
      target: s.pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, lang: safeLang },
    });
}

export async function removeSubscription(userId: number, endpoint: string): Promise<void> {
  await ensureSeed();
  await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint, endpoint));
}

/**
 * Локализованный вариант payload: ключ — язык интерфейса подписчика.
 * Отсутствующие языки откатываются на базовый `payload`.
 */
export type LocalizedPushPayload = Partial<Record<Locale, PushPayload>>;

/** Отправляет уведомление одному пользователю (все его подписки). */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
  localized?: LocalizedPushPayload,
): Promise<number> {
  if (!pushConfigured()) return 0;
  ensureConfigured();
  await ensureSeed();
  const subs = await db
    .select()
    .from(s.pushSubscriptions)
    .where(eq(s.pushSubscriptions.userId, userId));
  return sendToSubscriptions(subs, payload, localized);
}

/** Отправляет уведомление всем подписавшимся сотрудникам. */
export async function sendPushToAll(
  payload: PushPayload,
  localized?: LocalizedPushPayload,
): Promise<number> {
  if (!pushConfigured()) return 0;
  ensureConfigured();
  await ensureSeed();
  const subs = await db.select().from(s.pushSubscriptions);
  return sendToSubscriptions(subs, payload, localized);
}

/**
 * Рассылает по подпискам и чистит мёртвые: push-сервис возвращает 404/410,
 * когда подписка более недействительна (браузер переустановился, отозвал
 * разрешение), — такие строки удаляем, чтобы не копить мусор.
 */
async function sendToSubscriptions(
  subs: { id: number; endpoint: string; p256dh: string; auth: string; lang: string }[],
  payload: PushPayload,
  localized?: LocalizedPushPayload,
): Promise<number> {
  let sent = 0;
  for (const sub of subs) {
    const lang = (sub.lang === "uz" || sub.lang === "en" ? sub.lang : "ru") as Locale;
    const message = localized?.[lang] ?? payload;
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ ...message, url: message.url ?? "/" }),
      );
      sent += 1;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.id, sub.id));
      }
      // Остальные ошибки (сеть, 429, 5xx) пропускаем — уведомление не критично.
    }
  }
  return sent;
}

/** Список активных подписок текущего пользователя (для отображения в настройках). */
export async function subscriptionsForUser(userId: number): Promise<{ endpoint: string; createdAt: Date }[]> {
  await ensureSeed();
  const rows = await db
    .select()
    .from(s.pushSubscriptions)
    .where(eq(s.pushSubscriptions.userId, userId))
    .orderBy(s.pushSubscriptions.createdAt);
  return rows.map((r) => ({ endpoint: r.endpoint, createdAt: r.createdAt }));
}
