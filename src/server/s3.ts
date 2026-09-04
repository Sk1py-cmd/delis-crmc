import { randomUUID } from "node:crypto";
import { extFor } from "./fileExt";
import { sha256Hex, signRequest } from "./s3sign";
import type { StorageDriver, StoredFile } from "./storage";

/**
 * Драйвер хранения на S3-совместимом объектном хранилище:
 * AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces и т.п.
 *
 * Реализует тот же минимальный интерфейс `StorageDriver`, что и локальный
 * диск, поэтому вызывающий код (маршрут `/api/upload`) не меняется —
 * выбор хранилища сводится к переменным окружения.
 *
 * Подпись запросов — AWS Signature V4 из `s3sign.ts`, без внешних SDK.
 */

const DEFAULT_REGION = "us-east-1";

function envString(env: Record<string, string | undefined>, name: string, d = ""): string {
  const v = env[name];
  return v == null ? d : String(v);
}

export class S3StorageDriver implements StorageDriver {
  private readonly endpoint: URL;
  private readonly bucket: string;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly forcePathStyle: boolean;
  private readonly publicBase: string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch) {
    const endpoint = envString(env, "S3_ENDPOINT");
    const bucket = envString(env, "S3_BUCKET");
    const accessKeyId = envString(env, "S3_ACCESS_KEY_ID");
    const secretAccessKey = envString(env, "S3_SECRET_ACCESS_KEY");

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3-хранилище: задайте S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID и S3_SECRET_ACCESS_KEY",
      );
    }

    // Endpoint может прийти без схемы — подставляем https.
    this.endpoint = new URL(endpoint.includes("://") ? endpoint : `https://${endpoint}`);
    this.bucket = bucket;
    this.region = envString(env, "S3_REGION", DEFAULT_REGION);
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    // R2 и MinIO адресуются path-style (/{bucket}/{key}); AWS S3 — virtual-host.
    // По умолчанию path-style, для AWS задайте S3_FORCE_PATH_STYLE=false.
    this.forcePathStyle = envString(env, "S3_FORCE_PATH_STYLE", "true") !== "false";
    this.publicBase = (() => {
      const base = envString(env, "S3_PUBLIC_BASE_URL");
      return base ? base.replace(/\/+$/, "") : null;
    })();
    this.fetchImpl = fetchImpl;
  }

  /** Host для заголовка `host` и адреса запроса. */
  private hostHeader(): string {
    const host = this.endpoint.port
      ? `${this.endpoint.hostname}:${this.endpoint.port}`
      : this.endpoint.hostname;
    return this.forcePathStyle ? host : `${this.bucket}.${host}`;
  }

  /** Канонический путь объекта с учётом стиля адресации. */
  private pathFor(key: string): string {
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    return this.forcePathStyle ? `/${encodeURIComponent(this.bucket)}/${encoded}` : `/${encoded}`;
  }

  /** Публичный URL для отдачи файла клиенту. */
  private urlFor(key: string): string {
    if (this.publicBase) return `${this.publicBase}/${key}`;
    return `${this.endpoint.protocol}//${this.hostHeader()}${this.pathFor(key)}`;
  }

  private sign(method: string, key: string, body: Buffer, extra: Record<string, string>) {
    return signRequest({
      method,
      host: this.hostHeader(),
      path: this.pathFor(key),
      headers: { "x-amz-content-sha256": sha256Hex(body), ...extra },
      payload: body,
      region: this.region,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });
  }

  async save({ data, mime, originalName }: { data: Buffer; mime: string; originalName: string }): Promise<StoredFile> {
    const key = `${randomUUID()}${extFor(mime, originalName)}`;
    const { authorization, amzDate, payloadHash } = this.sign("PUT", key, data, {
      "content-type": mime,
    });

    const res = await this.fetchImpl(`${this.endpoint.protocol}//${this.hostHeader()}${this.pathFor(key)}`, {
      method: "PUT",
      headers: {
        authorization,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "content-type": mime,
      },
      body: new Uint8Array(data),
    });

    if (!res.ok) {
      throw new Error(`S3: не удалось сохранить файл (${res.status} ${res.statusText})`);
    }

    return { url: this.urlFor(key), key, size: data.byteLength, mime };
  }

  async remove(key: string): Promise<void> {
    const { authorization, amzDate, payloadHash } = this.sign("DELETE", key, Buffer.alloc(0), {});

    const res = await this.fetchImpl(`${this.endpoint.protocol}//${this.hostHeader()}${this.pathFor(key)}`, {
      method: "DELETE",
      headers: {
        authorization,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
      },
    });

    // 404 — файла уже нет, это не ошибка (удаление идемпотентно).
    if (!res.ok && res.status !== 404) {
      throw new Error(`S3: не удалось удалить файл (${res.status} ${res.statusText})`);
    }
  }
}
