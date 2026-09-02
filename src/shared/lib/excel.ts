import writeXlsxFile from "write-excel-file/browser";
import type { Row, SheetData, SheetOptions } from "write-excel-file/browser";

/**
 * Выгружает таблицу в XLSX и отдаёт файл браузеру.
 *
 * Раньше использовался `xlsx` (SheetJS) — у него две неисправленные
 * уязвимости (prototype pollution и ReDoS), и релиза с фиксом в npm нет.
 * Здесь нужна только запись, поэтому взята write-only библиотека без
 * собственных уязвимостей и втрое легче.
 *
 * @param headers  Заголовки колонок.
 * @param rows     Строки данных в том же порядке, что и заголовки.
 * @param filename Имя файла без расширения.
 */
export async function exportXLSX(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
): Promise<void> {
  const headerRow: Row = headers.map((title) => ({
    value: title,
    fontWeight: "bold",
  }));

  const dataRows: Row[] = rows.map((row) =>
    headers.map((_, i) => {
      const cell = row[i];

      // Числа выгружаем числами, чтобы в Excel работали суммы и сортировка.
      if (typeof cell === "number" && Number.isFinite(cell)) {
        return { type: Number, value: cell };
      }

      return { type: String, value: cell == null ? "" : String(cell) };
    }),
  );

  // Ширина колонки — по самому длинному значению, с разумными границами.
  const columns = headers.map((title, i) => {
    const longest = Math.max(
      title.length,
      ...rows.map((r) => String(r[i] ?? "").length),
    );
    return { width: Math.min(Math.max(longest + 2, 10), 50) };
  });

  // Явная аннотация выбирает перегрузку для «сырых» строк, а не для объектов.
  const sheetData: SheetData = [headerRow, ...dataRows];
  const sheetOptions: SheetOptions<Blob> = { columns, sheet: "Данные" };

  // В браузерной сборке файл сохраняется через toFile().
  await writeXlsxFile(sheetData, sheetOptions).toFile(`${filename}.xlsx`);
}
