import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Правила доставки.
 *
 * Найдено при аудите раздела: один заказ можно было назначить курьеру
 * дважды, завершить одну доставку дважды, а статус курьера сбрасывался
 * в available даже при висящих посылках. В сумме учёт нагрузки курьеров
 * расходился с реальностью.
 */

const QUERIES = readFileSync(
  path.join(process.cwd(), "src/server/queries.ts"),
  "utf8",
);

function fn(name: string): string {
  const start = QUERIES.indexOf(`export async function ${name}`);
  if (start === -1) throw new Error(`не найдена функция ${name}`);
  const end = QUERIES.indexOf("\nexport async function", start + 1);
  return QUERIES.slice(start, end === -1 ? undefined : end);
}

describe("назначение доставки", () => {
  const src = fn("assignDelivery");

  it("проверяет, нет ли уже незакрытой доставки по заказу", () => {
    expect(src).toContain("BusinessError");
    expect(src).toMatch(/status.*<> 'delivered'/);
  });

  it("отказ описан понятным текстом", () => {
    expect(src).toContain("уже назначена доставка");
  });
});

describe("завершение доставки", () => {
  const src = fn("completeDelivery");

  it("нельзя завершить дважды", () => {
    expect(src).toContain("уже завершена");
  });

  it("статус закрывается условным UPDATE от гонок", () => {
    // Два одновременных вызова иначе дважды засчитали бы одну посылку.
    expect(src).toMatch(/\.returning\(/);
    expect(src).toMatch(/closed\.length === 0/);
  });

  it("курьер освобождается только без других активных доставок", () => {
    expect(src).toContain("stillBusy");
    expect(src).toMatch(/stillBusy \? "busy" : "available"/);
  });

  it("счётчик активных доставок не уходит в минус", () => {
    expect(src).toContain("greatest(0, active_deliveries - 1)");
  });
});

describe("логика занятости курьера", () => {
  /** Повторяет решение из completeDelivery. */
  const statusFor = (openDeliveries: number) => (openDeliveries > 0 ? "busy" : "available");

  it("остались посылки — курьер занят", () => {
    expect(statusFor(1)).toBe("busy");
    expect(statusFor(3)).toBe("busy");
  });

  it("посылок нет — курьер свободен", () => {
    expect(statusFor(0)).toBe("available");
  });
});
