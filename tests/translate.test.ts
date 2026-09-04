import { describe, expect, it } from "vitest";
import { translateText } from "@/shared/i18n/translateText";
import { AUTO_TRANSLATIONS } from "@/shared/i18n/autoTranslations";

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

describe("AUTO_TRANSLATIONS", () => {
  it("наборы ключей en и uz совпадают", () => {
    const en = Object.keys(AUTO_TRANSLATIONS.en);
    const uz = Object.keys(AUTO_TRANSLATIONS.uz);
    expect(uz.filter((k) => !(k in AUTO_TRANSLATIONS.en))).toEqual([]);
    expect(en.filter((k) => !(k in AUTO_TRANSLATIONS.uz))).toEqual([]);
  });

  it("ни одно значение не пустое", () => {
    for (const lang of ["en", "uz"] as const) {
      const empty = Object.entries(AUTO_TRANSLATIONS[lang])
        .filter(([, v]) => v.trim() === "")
        .map(([k]) => k);
      expect(empty, `${lang}: ${empty.join(", ")}`).toEqual([]);
    }
  });
});
