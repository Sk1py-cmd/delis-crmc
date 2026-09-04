import { createHmac, randomBytes } from "node:crypto";

/**
 * TOTP (RFC 6238) для двухфакторной авторизации.
 *
 * Реализация без внешних зависимостей: HMAC-SHA1 из `node:crypto`,
 * base32 по RFC 4648. Совместима с Google Authenticator, Authy, 1Password
 * и другими приложениями, работающими со стандартным `otpauth://totp/...`.
 */

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Кодирует байты в base32 без заполняющих символов — формат ключей TOTP. */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Декодирует base32 обратно в байты. Игнорирует пробелы, дефисы и регистр. */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Генерирует новый секрет — 160 бит случайности, как принято в TOTP. */
export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function hmacSha1(key: Buffer, message: Buffer): Buffer {
  return createHmac("sha1", key).update(message).digest();
}

/** RFC 4226 dynamic truncation: из HMAC берём 31-битное число. */
function dynamicTruncation(hmac: Buffer): number {
  const offset = hmac[hmac.length - 1] & 0x0f;
  return (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  );
}

/**
 * Вычисляет текущий TOTP-код.
 *
 * `time` — миллисекунды (как `Date.now()`), чтобы совпадать с остальным
 * кодом приложения; в тестах можно передать точное время.
 */
export function generateTotp(
  secret: string,
  opts: { period?: number; digits?: number; time?: number } = {},
): string {
  const period = opts.period ?? 30;
  const digits = opts.digits ?? 6;
  const time = opts.time ?? Date.now();
  const counter = Math.floor(time / 1000 / period);

  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));

  const code = dynamicTruncation(hmacSha1(base32Decode(secret), message)) % 10 ** digits;
  return String(code).padStart(digits, "0");
}

/**
 * Проверяет код с допуском на рассинхрон часов: принимает код текущего
 * окна и по одному окну в обе стороны (`window = 1` по умолчанию).
 */
export function verifyTotp(
  token: string,
  secret: string,
  opts: { window?: number; period?: number; digits?: number } = {},
): boolean {
  const period = opts.period ?? 30;
  const digits = opts.digits ?? 6;
  const window = opts.window ?? 1;
  const clean = (token ?? "").replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${digits}}$`).test(clean)) return false;

  const now = Date.now();
  for (let w = -window; w <= window; w++) {
    if (generateTotp(secret, { period, digits, time: now + w * period * 1000 }) === clean) {
      return true;
    }
  }
  return false;
}

/** URI для сканирования камерой приложения-аутентификатора. */
export function otpauthUrl(secret: string, account: string, issuer = "DELIS CRM"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params =
    `secret=${secret}` +
    `&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1&digits=6&period=30`;
  return `otpauth://totp/${label}?${params}`;
}
