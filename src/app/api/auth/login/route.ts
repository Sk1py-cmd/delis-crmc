import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { verifyPassword } from "@/server/password";
import { COOKIE } from "@/server/auth";

export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = (await req.json()) as { login?: string; password?: string };
  const login = (body.login ?? "").trim();
  const password = body.password ?? "";
  if (!login || !password) {
    return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
  }

  const rows = await db.select().from(s.users).where(sql`lower(${s.users.login}) = lower(${login})`).limit(1);
  const user = rows[0];
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

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
    maxAge: 30 * 86400,
  });
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(sql`${s.users.id} = ${user.id}`);
  await db.insert(s.activity).values({ actor: user.name, action: "вошёл в систему", entity: "DELIS CRM" });

  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
