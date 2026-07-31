import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
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

export function canManageUsers(role: string) {
  return role === "owner" || role === "admin";
}
