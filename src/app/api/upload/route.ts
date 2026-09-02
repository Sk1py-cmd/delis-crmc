import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { storage, isAllowedMime, fileKind, sniffMatches } from "@/server/storage";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMITS: Record<string, number> = {
  image: 5 * 1024 * 1024,      // 5 MB
  video: 25 * 1024 * 1024,     // 25 MB
  application: 10 * 1024 * 1024, // 10 MB (PDF)
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const productId = Number(form.get("productId") ?? 0);

  if (!file) return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });

  const mime = file.type;
  const kind = fileKind(mime);

  if (kind === "other" || !isAllowedMime(mime)) {
    return NextResponse.json(
      { error: "Поддерживаются только изображения, видео и PDF" },
      { status: 415 },
    );
  }

  const limitKey = mime.split("/")[0];
  const limit = LIMITS[limitKey] ?? 5 * 1024 * 1024;
  if (file.size > limit) {
    return NextResponse.json(
      { error: `Файл слишком большой. Максимум для ${kind === "video" ? "видео" : kind === "pdf" ? "PDF" : "фото"}: ${Math.round(limit / 1024 / 1024)} MB` },
      { status: 413 },
    );
  }

  const data = Buffer.from(await file.arrayBuffer());

  if (!sniffMatches(data, mime)) {
    return NextResponse.json(
      { error: "Содержимое файла не соответствует его типу" },
      { status: 415 },
    );
  }

  // Файл сохраняется на диск; в БД попадает только короткий URL.
  const saved = await storage.save({ data, mime, originalName: file.name });

  // Привязка изображений к товару
  if (productId && kind === "image") {
    const [prod] = await db
      .select({ images: s.products.images })
      .from(s.products)
      .where(eq(s.products.id, productId));
    const existing = Array.isArray(prod?.images) ? prod.images : [];
    const images = [...existing.filter(Boolean), saved.url].slice(-6);
    await db.update(s.products).set({ image: images[0], images }).where(eq(s.products.id, productId));
  }

  return NextResponse.json({
    ok: true,
    url: saved.url,
    kind,
    name: file.name,
    size: saved.size,
    mime,
  });
}
