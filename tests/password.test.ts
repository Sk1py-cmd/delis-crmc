import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/password";

describe("hashPassword", () => {
  it("возвращает соль и хеш через двоеточие", () => {
    const [salt, hash] = hashPassword("delis2026").split(":");

    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it("даёт разный хеш при одинаковом пароле (соль случайная)", () => {
    expect(hashPassword("delis2026")).not.toBe(hashPassword("delis2026"));
  });
});

describe("verifyPassword", () => {
  it("принимает верный пароль", () => {
    expect(verifyPassword("delis2026", hashPassword("delis2026"))).toBe(true);
  });

  it("отклоняет неверный пароль", () => {
    expect(verifyPassword("wrong", hashPassword("delis2026"))).toBe(false);
  });

  it("различает регистр", () => {
    expect(verifyPassword("DELIS2026", hashPassword("delis2026"))).toBe(false);
  });

  it("работает с юникодом и пробелами", () => {
    const pw = "пароль с пробелами 🔐";
    expect(verifyPassword(pw, hashPassword(pw))).toBe(true);
  });

  it("не падает на пустом или битом значении из БД", () => {
    // Такое встречается у пользователей, созданных без пароля.
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "нет-двоеточия")).toBe(false);
    expect(verifyPassword("x", "соль:не-hex")).toBe(false);
    expect(verifyPassword("x", ":")).toBe(false);
  });

  it("отклоняет хеш неверной длины, а не бросает исключение", () => {
    // timingSafeEqual кидает на разной длине буферов — это должно быть поймано.
    expect(verifyPassword("x", "abcd:00ff")).toBe(false);
  });
});
