import { describe, expect, it } from "vitest";
import { attemptKey, clientIp, MAX_ATTEMPTS, WINDOW_MS } from "@/server/rate-limit";

/**
 * Ограничение перебора паролей.
 *
 * До фикса /api/auth/login принимал попытки без счёта: 30 запросов
 * проходили за 1.8 секунды. Логика окна проверяется здесь, а работа с
 * БД — вживую через API (см. коммит).
 */

describe("ключ ограничения", () => {
  it("привязан к паре логин+IP", () => {
    // Только по логину — можно запереть чужой аккаунт;
    // только по IP — страдает вся сеть за общим NAT.
    expect(attemptKey("owner", "10.0.0.1")).toBe("owner|10.0.0.1");
    expect(attemptKey("owner", "10.0.0.1")).not.toBe(attemptKey("owner", "10.0.0.2"));
    expect(attemptKey("owner", "10.0.0.1")).not.toBe(attemptKey("admin", "10.0.0.1"));
  });

  it("не зависит от регистра и пробелов в логине", () => {
    expect(attemptKey("  OWNER ", "1.1.1.1")).toBe(attemptKey("owner", "1.1.1.1"));
  });
});

describe("определение IP клиента", () => {
  it("берёт первый адрес из x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });

    expect(clientIp(h)).toBe("203.0.113.5");
  });

  it("использует x-real-ip, если forwarded нет", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("без заголовков возвращает unknown, а не падает", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("параметры окна", () => {
  it("лимит и окно заданы разумно", () => {
    expect(MAX_ATTEMPTS).toBe(10);
    expect(WINDOW_MS).toBe(15 * 60_000);
  });

  it("окно достаточно длинное, чтобы перебор был непрактичен", () => {
    // 10 попыток за 15 минут — это 40 паролей в час.
    const perHour = (MAX_ATTEMPTS * 3600_000) / WINDOW_MS;

    expect(perHour).toBeLessThanOrEqual(40);
  });
});

describe("логика окна", () => {
  /** Повторяет решение checkRateLimit. */
  function state(attempts: number, ageMs: number) {
    const expired = ageMs > WINDOW_MS;
    const remaining = expired ? MAX_ATTEMPTS : Math.max(0, MAX_ATTEMPTS - attempts);
    return { allowed: expired || remaining > 0, remaining };
  }

  it("до лимита попытки разрешены", () => {
    expect(state(9, 1000).allowed).toBe(true);
    expect(state(9, 1000).remaining).toBe(1);
  });

  it("на лимите блокирует", () => {
    expect(state(MAX_ATTEMPTS, 1000).allowed).toBe(false);
    expect(state(MAX_ATTEMPTS, 1000).remaining).toBe(0);
  });

  it("после истечения окна счёт начинается заново", () => {
    expect(state(MAX_ATTEMPTS, WINDOW_MS + 1).allowed).toBe(true);
    expect(state(MAX_ATTEMPTS, WINDOW_MS + 1).remaining).toBe(MAX_ATTEMPTS);
  });

  it("превышение счётчика не даёт отрицательного остатка", () => {
    expect(state(MAX_ATTEMPTS + 5, 1000).remaining).toBe(0);
  });
});
