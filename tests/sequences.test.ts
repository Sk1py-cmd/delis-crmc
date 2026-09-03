import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

/**
 * Регрессия: последовательности номеров отставали от демо-данных.
 *
 * Миграция `0001_unique_numbers` выполняет `setval` в момент своего
 * применения — то есть на ещё пустой базе. Сид заливает демо-данные уже
 * после неё и занимает DLS-24000…24067, PO-1200…1267, DLS-1000…1015.
 * Счётчики оставались на стартовых значениях, и первый же настоящий заказ
 * падал с `duplicate key value violates unique constraint`.
 *
 * Здесь воспроизводится ровно эта последовательность действий: миграции на
 * чистой базе → вставка «демо» строк → выравнивание счётчиков → проверка,
 * что следующий выданный номер свободен.
 *
 * Требуется PostgreSQL из DATABASE_URL; временные базы удаляются за собой.
 */

const url = process.env.DATABASE_URL;
const MIGRATIONS = path.join(process.cwd(), "drizzle");

function urlFor(dbName: string) {
  const u = new URL(url!);
  u.pathname = `/${dbName}`;
  return u.toString();
}

async function withAdmin<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const u = new URL(url!);
  u.pathname = "/postgres";
  const c = new Client({ connectionString: u.toString() });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function applyMigrations(c: Client) {
  const journal = JSON.parse(
    await readFile(path.join(MIGRATIONS, "meta", "_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };

  for (const entry of journal.entries) {
    const file = await readFile(path.join(MIGRATIONS, `${entry.tag}.sql`), "utf8");
    for (const stmt of file.split("--> statement-breakpoint")) {
      if (stmt.trim()) await c.query(stmt);
    }
  }
}

/**
 * Тот же SQL, что и в syncNumberSequences() из src/db/seed.ts.
 *
 * Дублируется намеренно: подключать сид означало бы тянуть весь слой
 * приложения ради трёх запросов, а проверяем мы здесь именно поведение
 * на стороне БД.
 */
async function syncSequences(c: Client) {
  const targets: [string, string, string, number][] = [
    ["order_number_seq", "orders", "number", 24000],
    ["purchase_order_number_seq", "purchase_orders", "number", 1200],
    ["product_sku_seq", "products", "sku", 1000],
  ];

  for (const [seq, table, column, floor] of targets) {
    await c.query(`
      select setval(
        '${seq}',
        greatest(
          ${floor},
          coalesce((select max((regexp_match(${column}, '(\\d+)'))[1]::bigint) from ${table}), 0)
        )
      )
    `);
  }
}

async function withFreshDb<T>(prefix: string, fn: (c: Client) => Promise<T>): Promise<T> {
  const name = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  await withAdmin((c) => c.query(`create database ${name}`));

  const c = new Client({ connectionString: urlFor(name) });
  await c.connect();
  try {
    await applyMigrations(c);
    return await fn(c);
  } finally {
    await c.end();
    await withAdmin((admin) => admin.query(`drop database if exists ${name}`));
  }
}

describe.skipIf(!url)("последовательности номеров", () => {
  it("после заливки демо-данных выдают свободный номер заказа", async () => {
    await withFreshDb("t_seq_order", async (c) => {
      // Демо-сид: 68 заказов, начиная с DLS-24000.
      for (let i = 0; i < 68; i++) {
        await c.query(`insert into orders (number, status, total) values ($1, 'new', '0')`, [
          `DLS-${24000 + i}`,
        ]);
      }

      // До выравнивания счётчик стоит на стартовом значении — это и есть баг.
      const before = await c.query(`select nextval('order_number_seq')::bigint as v`);
      expect(Number(before.rows[0].v)).toBeLessThanOrEqual(24068);

      await syncSequences(c);

      const { rows } = await c.query(`select nextval('order_number_seq')::bigint as v`);
      const number = `DLS-${rows[0].v}`;

      // Главное: номер свободен, вставка проходит.
      await expect(
        c.query(`insert into orders (number, status, total) values ($1, 'new', '0')`, [number]),
      ).resolves.toBeTruthy();
      expect(Number(rows[0].v)).toBeGreaterThan(24067);
    });
  });

  it("SKU товаров и номера закупок тоже выравниваются", async () => {
    await withFreshDb("t_seq_rest", async (c) => {
      for (let i = 0; i < 16; i++) {
        await c.query(`insert into products (name, slug, sku, price, cost) values ($1, $2, $3, '0', '0')`, [
          `Товар ${i}`,
          `tovar-${i}`,
          `DLS-${1000 + i}`,
        ]);
      }
      await c.query(`insert into suppliers (name) values ('Поставщик')`);
      for (let i = 0; i < 68; i++) {
        await c.query(`insert into purchase_orders (number, supplier_id, status, total) values ($1, 1, 'sent', '0')`, [
          `PO-${1200 + i}`,
        ]);
      }

      await syncSequences(c);

      const sku = await c.query(`select nextval('product_sku_seq')::bigint as v`);
      const po = await c.query(`select nextval('purchase_order_number_seq')::bigint as v`);

      expect(Number(sku.rows[0].v)).toBeGreaterThan(1015);
      expect(Number(po.rows[0].v)).toBeGreaterThan(1267);
    });
  });

  it("номер с разведённым дублем не задирает счётчик на порядок", async () => {
    await withFreshDb("t_seq_dup", async (c) => {
      // Миграция разводит дубликаты в вид `DLS-24001-5`. Если брать все
      // цифры подряд, получится 240015 — скачок на порядок.
      await c.query(`insert into orders (number, status, total) values ('DLS-24001-5', 'new', '0')`);

      await syncSequences(c);

      const { rows } = await c.query(`select last_value from order_number_seq`);
      expect(Number(rows[0].last_value)).toBe(24001);
    });
  });

  it("на пустой базе не опускаются ниже стартовых значений", async () => {
    await withFreshDb("t_seq_empty", async (c) => {
      await syncSequences(c);

      const { rows } = await c.query(`select last_value from order_number_seq`);
      expect(Number(rows[0].last_value)).toBe(24000);
    });
  });
});
