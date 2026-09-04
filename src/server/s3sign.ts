import { createHash, createHmac } from "node:crypto";

/**
 * Подпись запросов AWS Signature Version 4 (HMAC-SHA256) — минимальная
 * реализация для S3-совместимых хранилищ (AWS S3, Cloudflare R2, MinIO,
 * DigitalOcean Spaces и др.).
 *
 * Реализация без внешних зависимостей, на `node:crypto`. Проверена тестами
 * против официального тестового вектора AWS (get-vanilla из
 * aws-sig-v4-test-suite): `tests/s3sign.test.ts`.
 */

export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Timestamp в формате SigV4: `20150830T123600Z`. */
export function amzDate(d = new Date()): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export interface SignRequestOptions {
  method: string;
  /** Host (и порт, если нестандартный) — попадает в заголовок `host`. */
  host: string;
  /** Канонический путь, уже закодированный (например `/bucket/key`). */
  path: string;
  /** Дополнительные подписываемые заголовки (ключи в нижнем регистре). */
  headers?: Record<string, string>;
  /** Тело запроса; хеш становится каноническим payload-хешем. */
  payload?: Buffer | string;
  /** Каноническая строка запроса (пустая, если параметров нет). */
  query?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** По умолчанию `s3`; тестовый вектор AWS использует `service`. */
  service?: string;
  /** Фиксированная дата для детерминированных тестов. */
  date?: Date;
}

export interface SignedRequest {
  authorization: string;
  amzDate: string;
  payloadHash: string;
}

/**
 * Подписывает запрос и возвращает заголовок Authorization.
 *
 * `host` и `x-amz-date` подписываются всегда — они обязательны и их
 * значения выводятся из параметров, поэтому ошибиться с ними нельзя.
 * Остальные заголовки (например `content-type` и `x-amz-content-sha256`)
 * передаются через `headers` и попадают в подпись как есть.
 */
export function signRequest(opts: SignRequestOptions): SignedRequest {
  const date = opts.date ?? new Date();
  const amz = amzDate(date);
  const service = opts.service ?? "s3";
  const scope = `${amz.slice(0, 8)}/${opts.region}/${service}/aws4_request`;
  const payloadHash = sha256Hex(opts.payload ?? "");

  const headers: Record<string, string> = {
    host: opts.host,
    "x-amz-date": amz,
    ...Object.fromEntries(
      Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    ),
  };

  const names = Object.keys(headers).sort();
  const canonicalHeaders = names
    .map((n) => `${n}:${headers[n].trim().replace(/\s+/g, " ")}`)
    .join("\n");
  const signedHeaders = names.join(";");

  const canonicalRequest = [
    opts.method.toUpperCase(),
    opts.path || "/",
    opts.query ?? "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = createHmac("sha256", `AWS4${opts.secretAccessKey}`).update(amz.slice(0, 8)).digest();
  const kRegion = createHmac("sha256", kDate).update(opts.region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization = [
    "AWS4-HMAC-SHA256",
    `Credential=${opts.accessKeyId}/${scope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(" ");

  return { authorization, amzDate: amz, payloadHash };
}
