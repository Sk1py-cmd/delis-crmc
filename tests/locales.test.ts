import { describe, expect, it } from "vitest";
import { TRANSLATIONS, LOCALES } from "@/shared/i18n/locales";

/**
 * Полнота переводов: каждый ключ обязан существовать во всех трёх языках
 * и не быть пустым. Без этого новый текст, добавленный только в ru, молча
 * показывался бы по-русски пользователям uz/en — ровно то, что этот тест
 * ловит при сборке.
 */

const LANGS = Object.keys(LOCALES) as (keyof typeof TRANSLATIONS)[];

describe("полнота переводов", () => {
  it("набор ключей одинаков во всех языках", () => {
    const [base, ...rest] = LANGS;
    const baseKeys = Object.keys(TRANSLATIONS[base]);

    for (const lang of rest) {
      const keys = Object.keys(TRANSLATIONS[lang]);
      const missing = baseKeys.filter((k) => !(k in TRANSLATIONS[lang]));
      const extra = keys.filter((k) => !baseKeys.includes(k));

      expect(missing, `${lang}: нет ключей ${missing.join(", ")}`).toEqual([]);
      expect(extra, `${lang}: лишние ключи ${extra.join(", ")}`).toEqual([]);
    }
  });

  it("ни одно значение не пустое", () => {
    for (const lang of LANGS) {
      const empty = Object.entries(TRANSLATIONS[lang])
        .filter(([, v]) => v.trim() === "")
        .map(([k]) => k);

      expect(empty, `${lang}: пустые ключи ${empty.join(", ")}`).toEqual([]);
    }
  });

  it("все три языка объявлены", () => {
    expect(LANGS.sort()).toEqual(["en", "ru", "uz"]);
  });
});
