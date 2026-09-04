import path from "node:path";

/**
 * Расширение файла по MIME и оригинальному имени.
 *
 * Общий модуль для локального диска и S3/R2: имя файла от пользователя
 * не должно попадать в путь объекта (там бывает юникод и попытки обхода
 * каталога), поэтому расширение берём из MIME, а к имени обращаемся только
 * для неизвестных типов и с жёсткой проверкой на безопасные символы.
 */

/** Расширения по MIME для файлов, которые принимает приложение. */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
};

export function extFor(mime: string, originalName: string): string {
  const known = EXT_BY_MIME[mime];
  if (known) return known;

  // Берём расширение из имени файла, но только безопасное и короткое.
  const raw = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(raw) ? raw : "";
}
