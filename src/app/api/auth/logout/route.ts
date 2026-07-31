import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { COOKIE } from "@/server/auth";

export async function POST() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) {
    await db.delete(s.sessions).where(eq(s.sessions.token, token));
  }
  (await cookies()).delete(COOKIE);
  return NextResponse.json({ ok: true });
}
