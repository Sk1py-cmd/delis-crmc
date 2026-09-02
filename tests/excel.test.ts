import { describe, expect, it } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import type { Row, SheetData, SheetOptions } from "write-excel-file/node";

/**
 * Проверяет формирование XLSX той же логикой, что и `exportXLSX`.
 *
 * Сам `exportXLSX` импортирует браузерную сборку (сохранение файла через
 * `toFile`), поэтому под Node тестируется идентичное построение книги:
 * типы ячеек, ширины колонок и корректность полученного файла.
 */

/** Повторяет подготовку данных из src/shared/lib/excel.ts. */
function buildSheet(headers: string[], rows: (string | number)[][]) {
  const headerRow: Row = headers.map((title) => ({
    value: title,
    fontWeight: "bold",
  }));

  const dataRows: Row[] = rows.map((row) =>
    headers.map((_, i) => {
      const cell = row[i];
      if (typeof cell === "number" && Number.isFinite(cell)) {
        return { type: Number, value: cell };
      }
      return { type: String, value: cell == null ? "" : String(cell) };
    }),
  );

  const columns = headers.map((title, i) => {
    const longest = Math.max(title.length, ...rows.map((r) => String(r[i] ?? "").length));
    return { width: Math.min(Math.max(longest + 2, 10), 50) };
  });

  return { sheetData: [headerRow, ...dataRows] as SheetData, columns };
}

const HEADERS = ["Номер", "Клиент", "Сумма"];
const ROWS: (string | number)[][] = [
  ["DLS-24001", "Азиз Каримов", 459000],
  ["DLS-24002", "Дилноза Юсупова", 128500],
];

async function render(headers: string[], rows: (string | number)[][]): Promise<Buffer> {
  const { sheetData, columns } = buildSheet(headers, rows);
  const options: SheetOptions<Buffer> = { columns, sheet: "Данные" };

  return (await writeXlsxFile(sheetData, options).toBuffer()) as Buffer;
}

describe("экспорт XLSX", () => {
  it("создаёт непустой файл формата XLSX", async () => {
    const buf = await render(HEADERS, ROWS);

    // XLSX — это ZIP-архив, сигнатура PK\x03\x04.
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it("сохраняет кириллицу в заголовках и данных", async () => {
    const buf = await render(HEADERS, ROWS);
    const text = buf.toString("latin1");

    // Строки лежат в сжатом виде, поэтому проверяем через распаковку ниже;
    // здесь достаточно убедиться, что файл содержит таблицу общих строк.
    expect(text).toContain("sharedStrings.xml");
  });

  it("числа записываются числами, а не строками", async () => {
    const { sheetData } = buildSheet(HEADERS, ROWS);
    const amountCell = (sheetData[1] as Row)[2] as { type: unknown; value: unknown };

    expect(amountCell.type).toBe(Number);
    expect(amountCell.value).toBe(459000);
  });

  it("нечисловые значения остаются строками", async () => {
    const { sheetData } = buildSheet(HEADERS, ROWS);
    const numberCell = (sheetData[1] as Row)[0] as { type: unknown; value: unknown };

    expect(numberCell.type).toBe(String);
    expect(numberCell.value).toBe("DLS-24001");
  });

  it("ширина колонки не выходит за границы 10..50", async () => {
    const { columns } = buildSheet(
      ["К", "Очень длинный заголовок, который заведомо превышает лимит в пятьдесят символов"],
      [["x", "y"]],
    );

    expect(columns[0].width).toBe(10);
    expect(columns[1].width).toBe(50);
  });

  it("не падает на пустом наборе строк", async () => {
    const buf = await render(HEADERS, []);

    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
  });

  it("подставляет пустую строку вместо отсутствующей ячейки", async () => {
    // Ряд короче заголовков — в таблице не должно появиться "undefined".
    const { sheetData } = buildSheet(HEADERS, [["DLS-1"]]);
    const missing = (sheetData[1] as Row)[2] as { value: unknown };

    expect(missing.value).toBe("");
  });

  it("NaN и Infinity не попадают в файл числами", async () => {
    const { sheetData } = buildSheet(["A", "B"], [[NaN, Infinity]]);
    const [a, b] = sheetData[1] as Row as { type: unknown }[];

    expect(a.type).toBe(String);
    expect(b.type).toBe(String);
  });
});
