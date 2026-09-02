import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let dir: string;
// storage читает UPLOAD_DIR при импорте, поэтому подменяем переменную заранее.
let storage: typeof import("@/server/storage").storage;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "delis-upload-"));
  process.env.UPLOAD_DIR = dir;
  process.env.UPLOAD_PUBLIC_PREFIX = "/uploads";

  ({ storage } = await import("@/server/storage"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const png = Buffer.from("89504e470d0a1a0a", "hex");

describe("storage.save", () => {
  it("записывает файл на диск и возвращает публичный URL", async () => {
    const saved = await storage.save({ data: png, mime: "image/png", originalName: "photo.png" });

    expect(saved.url.startsWith("/uploads/")).toBe(true);
    expect(saved.size).toBe(png.byteLength);
    expect(saved.mime).toBe("image/png");
    await expect(readFile(path.join(dir, saved.key))).resolves.toEqual(png);
  });

  it("URL соответствует ключу объекта", async () => {
    const saved = await storage.save({ data: png, mime: "image/png", originalName: "a.png" });

    expect(saved.url).toBe(`/uploads/${saved.key}`);
  });

  it("даёт уникальные имена одинаковым файлам", async () => {
    const a = await storage.save({ data: png, mime: "image/png", originalName: "same.png" });
    const b = await storage.save({ data: png, mime: "image/png", originalName: "same.png" });

    expect(a.key).not.toBe(b.key);
  });

  it("не сохраняет оригинальное имя файла в пути", async () => {
    // Имя от пользователя не должно попадать в путь: там бывает и юникод,
    // и попытки обхода каталога.
    const saved = await storage.save({
      data: png,
      mime: "image/png",
      originalName: "../../секрет .png",
    });

    expect(saved.key).not.toContain("..");
    expect(saved.key).not.toContain("секрет");
    expect(saved.key).toMatch(/^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f-]+\.png$/);
  });

  it("подставляет расширение по MIME, а не по имени файла", async () => {
    const saved = await storage.save({ data: png, mime: "image/png", originalName: "noext" });

    expect(saved.key.endsWith(".png")).toBe(true);
  });

  it("раскладывает файлы по вложенным каталогам", async () => {
    const saved = await storage.save({ data: png, mime: "image/jpeg", originalName: "x.jpg" });

    expect(saved.key.split("/")).toHaveLength(3);
  });
});

describe("storage.remove", () => {
  it("удаляет ранее сохранённый файл", async () => {
    const saved = await storage.save({ data: png, mime: "image/png", originalName: "tmp.png" });
    await storage.remove(saved.key);

    await expect(access(path.join(dir, saved.key))).rejects.toThrow();
  });

  it("молча игнорирует отсутствующий файл", async () => {
    await expect(storage.remove("ab/cd/нет-такого.png")).resolves.toBeUndefined();
  });

  it("не выходит за пределы каталога загрузок", async () => {
    // Путь с ../ не должен привести к удалению чужого файла.
    await expect(storage.remove("../../../etc/passwd")).resolves.toBeUndefined();
    await expect(access("/etc/passwd")).resolves.toBeUndefined();
  });
});
