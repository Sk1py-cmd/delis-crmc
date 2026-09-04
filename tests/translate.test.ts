import { describe, expect, it } from "vitest";
import { translateText } from "@/shared/i18n/translateText";

/**
 * Подстановка переводов для серверно-отрендеренных страниц. Главный риск —
 * короткие ключи («сум», «шт», «Все»), которые раньше заменялись по
 * подстроке и портили длинные слова («сумма» → «so'mма», «Всего» →
 * «Barchasigo»). Эти тесты фиксируют границу слова.
 */

const dict = {
  "Все заказы": "All orders",
  "Все": "All",
  "Сумма": "Amount",
  "сум": "UZS",
  "шт": "pcs",
  "активны": "active",
  "продаж": "sold",
  "Телефон": "Phone",
};

describe("translateText", () => {
  it("точное совпадение узла", () => {
    expect(translateText("Все", dict)).toBe("All");
    expect(translateText("  Все  ", dict)).toBe("  All  ");
  });

  it("не портит слово, в котором ключ — лишь часть", () => {
    expect(translateText("сумма", { сум: "UZS" })).toBe("сумма");
    expect(translateText("Всего", { Все: "All" })).toBe("Всего");
    expect(translateText("Датировано", { Дата: "Date" })).toBe("Датировано");
  });

  it("переводит короткий ключ на границе слова", () => {
    expect(translateText("5 сум", { сум: "UZS" })).toBe("5 UZS");
    expect(translateText("12 шт", { шт: "pcs" })).toBe("12 pcs");
    expect(translateText("5 активны", { активны: "active" })).toBe("5 active");
  });

  it("длинные фразы выигрывают у слов-частей", () => {
    expect(translateText("Все заказы", dict)).toBe("All orders");
  });

  it("переводит слово среди пунктуации и не трогает падежи", () => {
    expect(translateText("5 продаж · 12000 сум", { продаж: "sold", сум: "UZS" })).toBe("5 sold · 12000 UZS");
    expect(translateText("продажам", { продаж: "sold" })).toBe("продажам");
  });
});
