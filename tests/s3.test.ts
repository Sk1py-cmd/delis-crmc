import { describe, expect, it, vi } from "vitest";
import { S3StorageDriver } from "@/server/s3";
import { sha256Hex } from "@/server/s3sign";

/**
 * Драйвер S3 без реального эндпоинта: подменяем `fetch` и проверяем,
 * что наружу уходят правильно подписанные и адресованные запросы.
 */

const ENV = {
  S3_ENDPOINT: "https://s3.example.com",
  S3_BUCKET: "delis-uploads",
  S3_ACCESS_KEY_ID: "AKIDEXAMPLE",
  S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  S3_REGION: "us-east-1",
};

function okResponse(status = 200): Response {
  return new Response(null, { status });
}

/** Подменяет fetch и фиксирует (url, init) каждого вызова. */
function fakeFetch(status = 200) {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => okResponse(status));
}

const png = Buffer.from("89504e470d0a1a0a", "hex");

describe("S3StorageDriver.save", () => {
  it("PUT-ит объект по path-style адресу с подписью SigV4", async () => {
    const fetchMock = fakeFetch();
    const driver = new S3StorageDriver(ENV, fetchMock);

    const saved = await driver.save({ data: png, mime: "image/png", originalName: "photo.png" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/s3\.example\.com\/delis-uploads\/[0-9a-f-]+\.png$/);

    const headers = init?.headers as Record<string, string>;
    expect(init?.method).toBe("PUT");
    expect(headers["content-type"]).toBe("image/png");
    expect(headers["x-amz-content-sha256"]).toBe(sha256Hex(png));
    expect(headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\//);
    expect(headers.authorization).toContain("SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date");

    expect(saved.url).toMatch(/^https:\/\/s3\.example\.com\/delis-uploads\/[0-9a-f-]+\.png$/);
    expect(saved.size).toBe(png.byteLength);
    expect(saved.mime).toBe("image/png");
  });

  it("отдаёт публичный URL через S3_PUBLIC_BASE_URL, если задан", async () => {
    const fetchMock = fakeFetch();
    const driver = new S3StorageDriver(
      { ...ENV, S3_PUBLIC_BASE_URL: "https://cdn.delis.uz/" },
      fetchMock,
    );

    const saved = await driver.save({ data: png, mime: "image/png", originalName: "x.png" });
    expect(saved.url).toMatch(/^https:\/\/cdn\.delis\.uz\/[0-9a-f-]+\.png$/);
  });

  it("virtual-host стиль адресует объект как bucket.host/key", async () => {
    const fetchMock = fakeFetch();
    const driver = new S3StorageDriver(
      { ...ENV, S3_FORCE_PATH_STYLE: "false" },
      fetchMock,
    );

    const saved = await driver.save({ data: png, mime: "image/png", originalName: "x.png" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/delis-uploads\.s3\.example\.com\/[0-9a-f-]+\.png$/);
    expect(saved.url).toMatch(/^https:\/\/delis-uploads\.s3\.example\.com\//);
  });

  it("поднимает ошибку при неуспешном статусе", async () => {
    const fetchMock = fakeFetch(403);
    const driver = new S3StorageDriver(ENV, fetchMock);

    await expect(driver.save({ data: png, mime: "image/png", originalName: "x.png" })).rejects.toThrow(/403/);
  });
});

describe("S3StorageDriver.remove", () => {
  it("DELETE-ит объект и терпит 404", async () => {
    const fetchMock = fakeFetch(404);
    const driver = new S3StorageDriver(ENV, fetchMock);

    await expect(driver.remove("ab/cd/file.png")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("поднимает ошибку при неуспешном статусе, кроме 404", async () => {
    const fetchMock = fakeFetch(500);
    const driver = new S3StorageDriver(ENV, fetchMock);

    await expect(driver.remove("ab/cd/file.png")).rejects.toThrow(/500/);
  });
});

describe("S3StorageDriver constructor", () => {
  it("требует полный набор переменных", () => {
    expect(() => new S3StorageDriver({})).toThrow(/S3_ENDPOINT/);
    expect(() => new S3StorageDriver({ S3_ENDPOINT: "x", S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k" })).toThrow(/S3_SECRET_ACCESS_KEY/);
  });

  it("добавляет схему https, если endpoint без неё", async () => {
    const fetchMock = fakeFetch();
    const driver = new S3StorageDriver(
      { ...ENV, S3_ENDPOINT: "s3.example.com" },
      fetchMock,
    );

    await driver.save({ data: png, mime: "image/png", originalName: "x.png" });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^https:\/\//);
  });
});
