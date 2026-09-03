import { cookies } from "next/headers";
import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/db/seed";

export const COOKIE = "delis_session";

export interface SessionUser {
  id: number;
  name: string;
  login: string;
  email: string;
  role: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    await ensureSeed();
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({ u: s.users })
      .from(s.sessions)
      .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
      .where(and(eq(s.sessions.token, token), gt(s.sessions.expiresAt, new Date())))
      .limit(1);
    const u = rows[0]?.u;
    return u ? { id: u.id, name: u.name, login: u.login, email: u.email, role: u.role } : null;
  } catch {
    return null;
  }
}

/**
 * Завершает сессии пользователя.
 *
 * Смена пароля не разрывала уже выданные сессии: после кражи ноутбука или
 * утечки cookie старый пароль переставал работать, а сама cookie продолжала
 * открывать разделы CRM — то есть смена пароля не решала ровно ту задачу,
 * ради которой её делают.
 *
 * `exceptToken` оставляет текущую вкладку живой, чтобы пользователь,
 * сменивший себе пароль, не выкидывался из системы сразу после нажатия
 * кнопки. Для админского сброса токен не передаётся — гасятся все.
 */
export async function revokeUserSessions(userId: number, exceptToken?: string): Promise<void> {
  const scope = eq(s.sessions.userId, userId);

  await db.delete(s.sessions).where(
    exceptToken ? and(scope, ne(s.sessions.token, exceptToken)) : scope,
  );
}

/** Токен текущей сессии — нужен, чтобы не гасить свою же вкладку. */
export async function currentSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

export function canManageUsers(role: string) {
  return role === "owner" || role === "admin";
}
