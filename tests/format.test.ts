import { describe, expect, it } from "vitest";
import { compact, money, num, statusMeta, dt, dateOnly, timeOnly } from "@/shared/lib/format";

/** В ru-RU разделитель разрядов — неразрывный пробел, сравниваем без него. */
const plain = (s: string) => s.replace(/\u00a0|\u202f/g, " ");

describe("money", () => {
  it("форматирует суммы с разделителями и валютой", () => {
    expect(plain(money(1234567))).toBe("1 234 567 сум");
  });

  it("принимает строки — из БД numeric приходит строкой", () => {
    expect(plain(money("459000"))).toBe("459 000 сум");
  });

  it("округляет дробные значения", () => {
    expect(plain(money(1500.6))).toBe("1 501 сум");
  });

  it("считает пустые значения нулём, а не NaN", () => {
    expect(plain(money(""))).toBe("0 сум");
    expect(plain(money(0))).toBe("0 сум");
  });

  it("поддерживает другую валюту", () => {
    expect(plain(money(1000, "USD"))).toBe("1 000 USD");
  });

  it("не теряет знак минуса", () => {
    expect(plain(money(-5000))).toBe("-5 000 сум");
  });
});

describe("compact", () => {
  it("сокращает тысячи, миллионы и миллиарды", () => {
    expect(compact(1500)).toBe("1.5 тыс");
    expect(compact(2_400_000)).toBe("2.4 млн");
    expect(compact(3_100_000_000)).toBe("3.1 млрд");
  });

  it("оставляет малые числа как есть", () => {
    expect(compact(999)).toBe("999");
  });

  it("сокращает и отрицательные значения (расходы в P&L)", () => {
    expect(compact(-2_400_000)).toBe("-2.4 млн");
  });

  it("корректен на границах диапазонов", () => {
    expect(compact(1000)).toBe("1.0 тыс");
    expect(compact(1_000_000)).toBe("1.0 млн");
  });
});

describe("num", () => {
  it("расставляет разделители разрядов", () => {
    expect(plain(num(1234567))).toBe("1 234 567");
  });

  it("пустое значение превращает в 0", () => {
    expect(num("")).toBe("0");
  });
});

describe("statusMeta", () => {
  it("возвращает подпись и цвет известного статуса", () => {
    expect(statusMeta("delivered")).toMatchObject({ label: "Доставлен", color: "#22c55e" });
  });

  it("для неизвестного статуса отдаёт сам ключ вместо падения", () => {
    expect(statusMeta("unknown_status")).toMatchObject({ key: "unknown_status", label: "unknown_status" });
  });
});

describe("форматирование дат", () => {
  it("пустые значения показывает прочерком, а не Invalid Date", () => {
    expect(dt(null)).toBe("—");
    expect(dt(undefined)).toBe("—");
    expect(dateOnly(null)).toBe("—");
    expect(timeOnly(null)).toBe("");
  });

  it("принимает Date и ISO-строку одинаково", () => {
    const iso = "2026-03-15T10:30:00.000Z";
    expect(dateOnly(iso)).toBe(dateOnly(new Date(iso)));
  });
});
