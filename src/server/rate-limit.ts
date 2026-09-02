import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

/**
 * Ограничение попыток входа.
 *
 * Без него пароль подбирался перебором: 30 попыток проходили за 1.8 с
 * без каких-либо помех. Счётчик хранится в БД, а не в памяти процесса,
 * иначе при нескольких инстансах или перезапуске лимит обнулялся бы.
 *
 * Ключ — логин + IP: блокировка по одному лишь логину позволяла бы
 * запереть чужой аккаунт, а по одному лишь IP — страдала бы вся сеть
 * за общим NAT.
 */

/** Сколько неудачных попыток допустимо в окне. */
export const MAX_ATTEMPTS = 10;

/** Длина окна и блокировки. */
export const WINDOW_MS = 15 * 60_000;

export type RateLimitState = {
  /** Разрешена ли следующая попытка. */
  allowed: boolean;
  /** Сколько попыток осталось до блокировки. */
  remaining: number;
  /** Через сколько секунд снова можно пробовать. */
  retryAfterSec: number;
};

/** Ключ ограничения: конкретный логин с конкретного адреса. */
export function attemptKey(login: string, ip: string): string {
  return `${login.trim().toLowerCase()}|${ip}`;
}

/**
 * IP клиента с учётом обратного прокси.
 *
 * `x-forwarded-for` присылает клиент, и подделать его тривиально: со свежим
 * значением в каждом запросе ключ всякий раз новый, и лимит по паре
 * логин+IP обходится полностью. Поэтому заголовкам верим только тогда,
 * когда приложение действительно стоит за прокси (`TRUST_PROXY=1`),
 * который эти заголовки перезаписывает.
 *
 * Прямое подключение (`TRUST_PROXY` не задан) отдаёт `unknown` — и вся
 * защита ложится на лимит по логину, который от заголовков не зависит.
 */
export function clientIp(headers: Headers, trustProxy = process.env.TRUST_PROXY === "1"): string {
  if (!trustProxy) return "unknown";

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/**
 * Ключ лимита по одному логину, без привязки к адресу.
 *
 * Страхует от подмены `x-forwarded-for`: адрес меняется, логин — нет.
 * Порог выше (см. `MAX_LOGIN_ATTEMPTS`), чтобы обычный пользователь с
 * забытым паролем не блокировал сам себя раньше основного лимита.
 */
export function loginKey(login: string): string {
  return `login:${login.trim().toLowerCase()}`;
}

/** Порог для лимита по логину — с запасом над основным. */
export const MAX_LOGIN_ATTEMPTS = MAX_ATTEMPTS * 3;

/**
 * Проверяет, не исчерпан ли лимит. Ничего не записывает — вызывается
 * до проверки пароля.
 */
export async function checkRateLimit(
  key: string,
  now = new Date(),
  max = MAX_ATTEMPTS,
): Promise<RateLimitState> {
  const [row] = await db
    .select()
    .from(s.loginAttempts)
    .where(sql`${s.loginAttempts.key} = ${key}`)
    .limit(1);

  if (!row) return { allowed: true, remaining: max, retryAfterSec: 0 };

  const windowStart = new Date(row.firstAttemptAt).getTime();
  const expired = now.getTime() - windowStart > WINDOW_MS;

  if (expired) return { allowed: true, remaining: max, retryAfterSec: 0 };

  const remaining = Math.max(0, max - row.attempts);
  const retryAfterSec = Math.max(1, Math.ceil((windowStart + WINDOW_MS - now.getTime()) / 1000));

  return { allowed: remaining > 0, remaining, retryAfterSec };
}

/** Фиксирует неудачную попытку и возвращает состояние после неё. */
export async function recordFailure(
  key: string,
  now = new Date(),
  max = MAX_ATTEMPTS,
): Promise<RateLimitState> {
  const cutoff = new Date(now.getTime() - WINDOW_MS);

  // Окно устарело — начинаем счёт заново, иначе увеличиваем счётчик.
  await db.execute(sql`
    insert into login_attempts (key, attempts, first_attempt_at, last_attempt_at)
    values (${key}, 1, ${now}, ${now})
    on conflict (key) do update set
      attempts = case
        when login_attempts.first_attempt_at < ${cutoff} then 1
        else login_attempts.attempts + 1
      end,
      first_attempt_at = case
        when login_attempts.first_attempt_at < ${cutoff} then ${now}
        else login_attempts.first_attempt_at
      end,
      last_attempt_at = ${now}
  `);

  return checkRateLimit(key, now, max);
}

/** Сбрасывает счётчик после успешного входа. */
export async function clearAttempts(key: string): Promise<void> {
  await db.delete(s.loginAttempts).where(sql`${s.loginAttempts.key} = ${key}`);
}
