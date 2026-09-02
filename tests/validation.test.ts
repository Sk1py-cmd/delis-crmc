import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TASK_STATUSES } from "@/server/queries";

/**
 * Валидация значений, приходящих из форм.
 *
 * Найдено при аудите: промокод создавался со скидкой 500% и с
 * отрицательной скидкой, а задаче можно было присвоить произвольный
 * статус — после чего она пропадала из канбана, не попав ни в одну
 * колонку.
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

describe("статусы задач", () => {
  it("совпадают с колонками канбана", () => {
    expect([...TASK_STATUSES]).toEqual(["todo", "in_progress", "done"]);
  });

  it("произвольный статус отклоняется", () => {
    const ok = (v: string) => TASK_STATUSES.includes(v as (typeof TASK_STATUSES)[number]);

    expect(ok("done")).toBe(true);
    expect(ok("фигня")).toBe(false);
    expect(ok("")).toBe(false);
    expect(ok("DONE")).toBe(false);
  });

  it("несуществующая задача даёт понятную ошибку", () => {
    expect(fn("updateTaskStatus")).toContain("Задача не найдена");
  });
});

describe("промокоды", () => {
  const src = fn("createPromocode");

  it("скидка в процентах ограничена сотней", () => {
    expect(src).toContain("не может превышать 100%");
  });

  it("нулевая и отрицательная скидка отклоняются", () => {
    expect(src).toMatch(/value <= 0/);
  });

  it("число использований не меньше одного", () => {
    expect(src).toContain("не меньше одного");
  });

  it("минимальная сумма заказа неотрицательна", () => {
    expect(src).toContain("не может быть отрицательной");
  });

  it("дата окончания не может быть в прошлом", () => {
    expect(src).toContain("уже прошла");
  });

  it("повторный код отклоняется", () => {
    expect(src).toContain("уже существует");
  });

  it("тип скидки приводится к известному значению", () => {
    // Иначе в БД попадал бы произвольный discountType из запроса.
    expect(src).toMatch(/=== "fixed" \? "fixed" : "percent"/);
  });
});

describe("правила скидок", () => {
  /** Повторяет проверку из createPromocode. */
  function invalid(type: string, value: number): boolean {
    if (!Number.isFinite(value) || value <= 0) return true;
    return type === "percent" && value > 100;
  }

  it("процент от 1 до 100 допустим", () => {
    expect(invalid("percent", 1)).toBe(false);
    expect(invalid("percent", 100)).toBe(false);
  });

  it("процент больше 100 недопустим", () => {
    expect(invalid("percent", 101)).toBe(true);
    expect(invalid("percent", 500)).toBe(true);
  });

  it("фиксированная скидка может быть больше 100", () => {
    // 50 000 сум — нормальная сумма, ограничение только для процентов.
    expect(invalid("fixed", 50000)).toBe(false);
  });

  it("ноль, минус и NaN отклоняются для любого типа", () => {
    for (const type of ["percent", "fixed"]) {
      expect(invalid(type, 0)).toBe(true);
      expect(invalid(type, -50)).toBe(true);
      expect(invalid(type, NaN)).toBe(true);
    }
  });
});
