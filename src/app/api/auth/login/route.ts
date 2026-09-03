import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { verifyPassword } from "@/server/password";
import { COOKIE } from "@/server/auth";
import { MAX_LOGIN_ATTEMPTS, attemptKey, checkRateLimit, clearAttempts, clientIp, loginKey, recordFailure } from "@/server/rate-limit";

export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = (await req.json()) as { login?: string; password?: string };
  const login = (body.login ?? "").trim();
  const password = body.password ?? "";
  if (!login || !password) {
    return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
  }

  // Ограничение перебора: без него 30 попыток проходили за 1.8 с.
  const key = attemptKey(login, clientIp(req.headers));
  // Второй ключ — по одному логину. `x-forwarded-for` подделывается клиентом,
  // и со свежим адресом в каждом запросе первый лимит обходился бы полностью.
  const byLogin = loginKey(login);

  for (const [k, max] of [[key, undefined], [byLogin, MAX_LOGIN_ATTEMPTS]] as const) {
    const limit = await checkRateLimit(k, new Date(), max);
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryAfterSec / 60);
      return NextResponse.json(
        { error: `Слишком много попыток входа. Повторите через ${minutes} мин.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }
  }

  const rows = await db.select().from(s.users).where(sql`lower(${s.users.login}) = lower(${login})`).limit(1);
  const user = rows[0];
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    // Считаем и несуществующие логины: иначе перебор имён шёл бы свободно.
    const after = await recordFailure(key);
    await recordFailure(byLogin, new Date(), MAX_LOGIN_ATTEMPTS);
    const error = after.remaining > 0
      ? "Неверный логин или пароль"
      : "Слишком много попыток входа. Повторите позже.";

    return NextResponse.json({ error }, { status: after.remaining > 0 ? 401 : 429 });
  }

  // Успешный вход обнуляет счётчик.
  await clearAttempts(key);
  await clearAttempts(byLogin);

  const token = crypto.randomUUID();
  await db.insert(s.sessions).values({
    token,
    userId: user.id,
    device: (req.headers.get("user-agent") ?? "").slice(0, 80),
    expiresAt: new Date(Date.now() + 30 * 86400_000),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    // По HTTPS cookie не должна уходить в открытом виде. В dev по http
    // флаг выключен, иначе браузер её просто не сохранит.
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 86400,
  });
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(sql`${s.users.id} = ${user.id}`);
  await db.insert(s.activity).values({ actor: user.name, action: "вошёл в систему", entity: "DELIS CRM" });

  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
