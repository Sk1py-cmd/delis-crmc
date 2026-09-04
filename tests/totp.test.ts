import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  generateSecret,
  generateTotp,
  otpauthUrl,
  verifyTotp,
} from "@/server/totp";

/**
 * Векторы из RFC 6238 (SHA-1, 8 цифр). Ключ — ASCII "12345678901234567890",
 * который в base32 выглядит как GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ.
 */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32", () => {
  it("кодирует и декодирует без потерь", () => {
    const bytes = Buffer.from("hello world 123");
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it("декодирует стандартный тестовый ключ RFC 6238 в ASCII", () => {
    expect(base32Decode(RFC_SECRET).toString("ascii")).toBe("12345678901234567890");
  });

  it("декодирование игнорирует пробелы и регистр", () => {
    const key = "gezd gnbv gy3t qojq gez dgnb vgy3 tqoj q";
    expect(base32Decode(key).toString("ascii")).toBe("12345678901234567890");
  });
});

describe("generateTotp", () => {
  it("совпадает с векторами RFC 6238 (SHA-1, 8 цифр)", () => {
    const vectors: [number, string][] = [
      [59, "94287082"],
      [1111111109, "07081804"],
      [1111111111, "14050471"],
      [1234567890, "89005924"],
      [2000000000, "69279037"],
      [20000000000, "65353130"],
    ];
    for (const [t, expected] of vectors) {
      expect(generateTotp(RFC_SECRET, { time: t * 1000, digits: 8 })).toBe(expected);
    }
  });

  it("по умолчанию выдаёт 6 цифр с ведущими нулями", () => {
    // 8-значный вектор, урезанный до 6 цифр, — проверяем лишь формат.
    const code = generateTotp(RFC_SECRET, { time: 59_000 });
    expect(code).toMatch(/^\d{6}$/);
  });
});

describe("generateSecret", () => {
  it("выдаёт base32-строку и не повторяется", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(b).toMatch(/^[A-Z2-7]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe("verifyTotp", () => {
  it("принимает код текущего окна", () => {
    const secret = generateSecret();
    expect(verifyTotp(generateTotp(secret), secret)).toBe(true);
  });

  it("принимает код с пробелами внутри", () => {
    const secret = generateSecret();
    const code = generateTotp(secret);
    expect(verifyTotp(`${code.slice(0, 3)} ${code.slice(3)}`, secret)).toBe(true);
  });

  it("отклоняет неверный и нецифровой код", () => {
    const secret = generateSecret();
    expect(verifyTotp("000000", secret)).toBe(false);
    expect(verifyTotp("abcdef", secret)).toBe(false);
  });

  it("отклоняет код, если секрет пустой", () => {
    expect(verifyTotp("123456", "")).toBe(false);
  });
});

describe("otpauthUrl", () => {
  it("формирует корректный URI", () => {
    const url = otpauthUrl("ABCDEFGH", "owner@delis.uz", "DELIS CRM");
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=ABCDEFGH");
    expect(url).toContain("issuer=DELIS%20CRM");
    expect(url).toContain("algorithm=SHA1");
  });
});
