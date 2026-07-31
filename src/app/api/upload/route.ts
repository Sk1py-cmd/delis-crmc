import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
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

function fileKind(mime: string): "image" | "video" | "pdf" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const productId = Number(form.get("productId") ?? 0);

  if (!file) return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });

  const kind = fileKind(file.type);
  if (kind === "other") {
    return NextResponse.json({ error: "Поддерживаются только изображения, видео и PDF" }, { status: 415 });
  }

  const limitKey = file.type.split("/")[0];
  const limit = LIMITS[limitKey] ?? 5 * 1024 * 1024;
  if (file.size > limit) {
    return NextResponse.json(
      { error: `Файл слишком большой. Максимум для ${kind === "video" ? "видео" : kind === "pdf" ? "PDF" : "фото"}: ${Math.round(limit / 1024 / 1024)} MB` },
      { status: 413 },
    );
  }

  const bytes = await file.arrayBuffer();
  const b64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${b64}`;

  // Привязка изображений к товару
  if (productId && kind === "image") {
    const [prod] = await db.select({ images: s.products.images }).from(s.products).where(eq(s.products.id, productId));
    const existing = Array.isArray(prod?.images) ? prod.images : [];
    const images = [...existing.filter(Boolean), dataUrl].slice(-6);
    await db.update(s.products).set({ image: images[0], images }).where(eq(s.products.id, productId));
  }

  return NextResponse.json({
    ok: true,
    url: dataUrl,
    kind,
    name: file.name,
    size: file.size,
    mime: file.type,
  });
}
