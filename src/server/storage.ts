import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Слой хранения загруженных файлов.
 *
 * Раньше файлы кодировались в base64 и складывались прямо в БД (data-URL).
 * Это раздувало базу, ломало кеширование в браузере и увеличивало каждый
 * SELECT на мегабайты. Теперь байты лежат на диске, а в БД попадает
 * только короткий публичный URL.
 *
 * Интерфейс намеренно минимальный, чтобы подмена на S3/R2 сводилась к
 * реализации `StorageDriver` без правок вызывающего кода.
 */

/** Белый список MIME: принимаем только то, что умеем показывать. */
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
]);

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

export type FileKind = "image" | "video" | "pdf" | "other";

export function fileKind(mime: string): FileKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

/**
 * Проверяет «магические байты» файла.
 *
 * Content-Type приходит от клиента и легко подделывается, поэтому
 * дополнительно сверяем сигнатуру: так исполняемый файл не притворится
 * картинкой.
 */
export function sniffMatches(buf: Buffer, mime: string): boolean {
  const startsWith = (...bytes: number[]) => bytes.every((b, i) => buf[i] === b);
  const ascii = (offset: number, text: string) =>
    buf.subarray(offset, offset + text.length).toString("latin1") === text;

  switch (mime) {
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47);
    case "image/gif":
      return ascii(0, "GIF8");
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "image/avif":
      return ascii(4, "ftyp");
    case "video/mp4":
    case "video/quicktime":
      return ascii(4, "ftyp");
    case "video/webm":
      return startsWith(0x1a, 0x45, 0xdf, 0xa3);
    case "application/pdf":
      return ascii(0, "%PDF");
    default:
      return false;
  }
}

export interface StoredFile {
  /** Публичный URL для отдачи файла клиенту. */
  url: string;
  /** Ключ объекта в хранилище — нужен для удаления. */
  key: string;
  size: number;
  mime: string;
}

export interface StorageDriver {
  save(input: { data: Buffer; mime: string; originalName: string }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

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

function extFor(mime: string, originalName: string): string {
  const known = EXT_BY_MIME[mime];
  if (known) return known;

  // Берём расширение из имени файла, но только безопасное и короткое.
  const raw = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(raw) ? raw : "";
}

/**
 * Хранение на локальном диске.
 *
 * Каталог по умолчанию — `public/uploads`, чтобы Next отдавал файлы
 * статикой без дополнительного роутинга. На платформах с эфемерной ФС
 * (Vercel и т.п.) путь следует переопределить через `UPLOAD_DIR` и
 * примонтировать постоянный том — либо подключить объектное хранилище.
 */
class LocalDiskDriver implements StorageDriver {
  private readonly dir: string;
  private readonly publicPrefix: string;

  constructor() {
    this.dir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(process.cwd(), "public", "uploads");
    this.publicPrefix = process.env.UPLOAD_PUBLIC_PREFIX ?? "/uploads";
  }

  async save({ data, mime, originalName }: { data: Buffer; mime: string; originalName: string }) {
    // Раскладываем по подкаталогам вида ab/cd: тысячи файлов в одной
    // директории замедляют файловую систему.
    const id = randomUUID();
    const shard = createHash("sha1").update(id).digest("hex").slice(0, 4);
    const subdir = path.join(shard.slice(0, 2), shard.slice(2, 4));
    const name = `${id}${extFor(mime, originalName)}`;

    await mkdir(path.join(this.dir, subdir), { recursive: true });
    await writeFile(path.join(this.dir, subdir, name), data);

    const key = path.posix.join(subdir.split(path.sep).join("/"), name);

    return {
      url: `${this.publicPrefix}/${key}`,
      key,
      size: data.byteLength,
      mime,
    };
  }

  async remove(key: string) {
    // Защита от выхода за пределы каталога загрузок.
    const target = path.resolve(this.dir, key);
    if (!target.startsWith(path.resolve(this.dir))) return;

    await unlink(target).catch(() => undefined);
  }
}

export const storage: StorageDriver = new LocalDiskDriver();
