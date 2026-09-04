import { describe, expect, it } from "vitest";
import { amzDate, sha256Hex, signRequest } from "@/server/s3sign";

/**
 * Официальный тестовый вектор AWS Signature V4 (aws-sig-v4-test-suite,
 * пример get-vanilla). Ключи и подпись из документации AWS — они публичны
 * и не являются секретами.
 */
const VECTOR = {
  method: "GET",
  host: "example.amazonaws.com",
  path: "/",
  payload: "",
  region: "us-east-1",
  service: "service",
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  date: new Date("2015-08-30T12:36:00Z"),
  authorization:
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
    "SignedHeaders=host;x-amz-date, " +
    "Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
};

describe("sha256Hex", () => {
  it("хеш пустой строки совпадает с каноническим значением SigV4", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("хеш строки «abc» совпадает с известным SHA-256", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("amzDate", () => {
  it("форматирует дату в SigV4-вид", () => {
    expect(amzDate(new Date("2015-08-30T12:36:00Z"))).toBe("20150830T123600Z");
  });
});

describe("signRequest", () => {
  it("воспроизводит официальный вектор get-vanilla", () => {
    expect(signRequest(VECTOR).authorization).toBe(VECTOR.authorization);
  });

  it("сортирует подписываемые заголовки по алфавиту", () => {
    const r = signRequest({
      ...VECTOR,
      headers: { "x-amz-content-sha256": sha256Hex(""), "content-type": "text/plain" },
    });
    expect(r.authorization).toContain("SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date,");
  });

  it("считает payload-хеш от тела запроса", () => {
    const body = Buffer.from("hello");
    const r = signRequest({ ...VECTOR, method: "PUT", payload: body });
    expect(r.payloadHash).toBe(sha256Hex(body));
    expect(r.authorization).toContain(`Signature=`);
  });

  it("по умолчанию подписывает сервис s3", () => {
    const r = signRequest({ ...VECTOR, service: undefined });
    expect(r.authorization).toContain("us-east-1/s3/aws4_request");
  });
});
