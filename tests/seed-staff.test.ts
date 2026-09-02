import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_ACCESS } from "@/shared/config/nav";

/**
 * Учётные данные демо-сотрудников.
 *
 * Демо-набор создавал сотрудников без логина и пароля: войти можно было
 * только под owner, а проверить роли вживую — нет. Здесь проверяется, что
 * логика выдачи учётных данных не потеряется при правках сида.
 */

const SEED = readFileSync(path.join(process.cwd(), "src/db/seed.ts"), "utf8");

/** Пары email -> login из DEMO_STAFF. */
const staff = [...SEED.matchAll(/\{ email: "([^"]+)", login: "([^"]+)" \}/g)].map((m) => ({
  email: m[1],
  login: m[2],
}));

describe("демо-сотрудники", () => {
  it("описаны в сиде", () => {
    expect(staff.length).toBe(5);
  });

  it("логины уникальны и не пусты", () => {
    const logins = staff.map((s) => s.login);

    expect(new Set(logins).size).toBe(logins.length);
    expect(logins.every((l) => l.length > 0)).toBe(true);
  });

  it("логин соответствует почте", () => {
    for (const { email, login } of staff) {
      expect(email.startsWith(`${login}@`)).toBe(true);
    }
  });

  it("каждый логин — существующая роль", () => {
    // Логины совпадают с названиями ролей, кроме admin (полный доступ).
    const known = new Set([...Object.keys(ROLE_ACCESS), "admin"]);
    const unknown = staff.filter((s) => !known.has(s.login));

    expect(unknown).toEqual([]);
  });

  it("покрыты все рядовые роли, чтобы их можно было проверить вживую", () => {
    const logins = new Set(staff.map((s) => s.login));

    for (const role of ["manager", "warehouse", "support", "agent"]) {
      expect(logins.has(role)).toBe(true);
    }
  });
});

describe("безопасность выдачи учётных данных", () => {
  it("пароль демо-сотрудников отделён от пароля владельца", () => {
    // Разные переменные окружения: смена пароля owner не должна открывать
    // вход в витринные аккаунты и наоборот.
    expect(SEED).toContain("DEMO_PASSWORD");
    expect(SEED).toContain("OWNER_PASSWORD");
  });

  it("заполняются только пустые логины", () => {
    // Иначе сид перетирал бы настоящие аккаунты с теми же адресами почты.
    expect(SEED).toContain("coalesce(login, '') = ''");
  });

  it("не занимает логин, который уже кем-то используется", () => {
    expect(SEED).toMatch(/not exists \(select 1 from users u2 where u2\.login/);
  });

  it("пароль сохраняется хешем, а не открытым текстом", () => {
    expect(SEED).toMatch(/const hash = hashPassword\(DEMO_PASSWORD\)/);
  });

  it("выдача вызывается и для существующих баз, и после первичного сида", () => {
    // Сотрудники могут быть уже в базе либо создаваться ниже по коду —
    // один вызов покрывал только первый случай.
    const calls = [...SEED.matchAll(/await ensureDemoStaff\(\)/g)];

    expect(calls.length).toBe(2);
  });
});
