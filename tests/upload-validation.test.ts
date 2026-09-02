import { describe, expect, it } from "vitest";
import { fileKind, isAllowedMime, sniffMatches } from "@/server/storage";

/** Готовит буфер с нужной сигнатурой в начале. */
const buf = (...parts: (number | string)[]) => {
  const chunks = parts.map((p) => (typeof p === "string" ? Buffer.from(p, "latin1") : Buffer.from([p])));
  return Buffer.concat(chunks);
};

const PNG = buf(0x89, "PNG\r\n\u001a\n");
const JPEG = buf(0xff, 0xd8, 0xff, 0xe0);
const GIF = buf("GIF89a");
const WEBP = buf("RIFF", 0x00, 0x00, 0x00, 0x00, "WEBP");
const PDF = buf("%PDF-1.7");
const MP4 = buf(0x00, 0x00, 0x00, 0x18, "ftypmp42");
const WEBM = buf(0x1a, 0x45, 0xdf, 0xa3);

describe("fileKind", () => {
  it("определяет категорию по MIME", () => {
    expect(fileKind("image/png")).toBe("image");
    expect(fileKind("video/mp4")).toBe("video");
    expect(fileKind("application/pdf")).toBe("pdf");
  });

  it("неизвестные типы помечает как other", () => {
    expect(fileKind("application/x-sh")).toBe("other");
    expect(fileKind("text/html")).toBe("other");
    expect(fileKind("")).toBe("other");
  });
});

describe("isAllowedMime", () => {
  it("разрешает поддерживаемые форматы", () => {
    for (const mime of ["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]) {
      expect(isAllowedMime(mime), mime).toBe(true);
    }
  });

  it("запрещает SVG — это вектор XSS", () => {
    expect(isAllowedMime("image/svg+xml")).toBe(false);
  });

  it("запрещает исполняемые и разметку", () => {
    for (const mime of ["text/html", "application/x-sh", "application/javascript", "application/octet-stream"]) {
      expect(isAllowedMime(mime), mime).toBe(false);
    }
  });
});

describe("sniffMatches", () => {
  it("принимает файлы с корректной сигнатурой", () => {
    expect(sniffMatches(PNG, "image/png")).toBe(true);
    expect(sniffMatches(JPEG, "image/jpeg")).toBe(true);
    expect(sniffMatches(GIF, "image/gif")).toBe(true);
    expect(sniffMatches(WEBP, "image/webp")).toBe(true);
    expect(sniffMatches(PDF, "application/pdf")).toBe(true);
    expect(sniffMatches(MP4, "video/mp4")).toBe(true);
    expect(sniffMatches(WEBM, "video/webm")).toBe(true);
  });

  it("отклоняет shell-скрипт, выдающий себя за PNG", () => {
    const shell = Buffer.from("#!/bin/sh\necho pwned\n");

    expect(sniffMatches(shell, "image/png")).toBe(false);
  });

  it("отклоняет HTML под видом картинки", () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>");

    expect(sniffMatches(html, "image/jpeg")).toBe(false);
  });

  it("не путает форматы между собой", () => {
    expect(sniffMatches(PNG, "image/jpeg")).toBe(false);
    expect(sniffMatches(JPEG, "application/pdf")).toBe(false);
    expect(sniffMatches(PDF, "image/png")).toBe(false);
  });

  it("не падает на пустом и слишком коротком буфере", () => {
    expect(sniffMatches(Buffer.alloc(0), "image/png")).toBe(false);
    expect(sniffMatches(Buffer.from([0x89]), "image/png")).toBe(false);
  });

  it("отклоняет любой неизвестный MIME", () => {
    expect(sniffMatches(PNG, "application/x-sh")).toBe(false);
  });

  it("WEBP требует и RIFF, и метку WEBP", () => {
    // RIFF-контейнер сам по себе может быть, например, WAV.
    const wav = buf("RIFF", 0x00, 0x00, 0x00, 0x00, "WAVE");

    expect(sniffMatches(wav, "image/webp")).toBe(false);
  });
});
