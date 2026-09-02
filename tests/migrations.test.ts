import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

/**
 * Проверяет, что сгенерированные миграции применимы к чистой базе и
 * дают ту же схему, что описана в `src/db/schema.ts`.
 *
 * Тесты требуют доступного PostgreSQL из DATABASE_URL и создают
 * временные базы, удаляя их за собой.
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

async function withDb<T>(dbName: string, fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: urlFor(dbName) });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function applyMigrations(c: Client) {
  const file = await readFile(path.join(MIGRATIONS, "0000_living_shaman.sql"), "utf8");
  for (const stmt of file.split("--> statement-breakpoint")) {
    if (stmt.trim()) await c.query(stmt);
  }
}

const COLUMNS_QUERY = `
  select table_name, column_name, data_type, is_nullable
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, column_name
`;

describe.skipIf(!url)("миграции", () => {
  it("применяются к чистой базе без ошибок", async () => {
    const db = `t_mig_${Date.now()}`;
    await withAdmin((c) => c.query(`create database ${db}`));

    try {
      await withDb(db, async (c) => {
        await applyMigrations(c);

        const { rows } = await c.query<{ n: string }>(
          `select count(*) n from information_schema.tables where table_schema='public'`,
        );
        expect(Number(rows[0].n)).toBe(30);
      });
    } finally {
      await withAdmin((c) => c.query(`drop database if exists ${db} with (force)`));
    }
  }, 60_000);

  it("повторное применение падает — значит журнал миграций обязателен", async () => {
    // Именно из-за этого поведения в seed.ts понадобился baseline
    // для баз, созданных старой версией приложения.
    const db = `t_twice_${Date.now()}`;
    await withAdmin((c) => c.query(`create database ${db}`));

    try {
      await withDb(db, async (c) => {
        await applyMigrations(c);
        await expect(applyMigrations(c)).rejects.toThrow(/already exists/);
      });
    } finally {
      await withAdmin((c) => c.query(`drop database if exists ${db} with (force)`));
    }
  }, 60_000);

  it("схема совпадает со снимком drizzle-kit", async () => {
    const db = `t_snap_${Date.now()}`;
    await withAdmin((c) => c.query(`create database ${db}`));

    try {
      await withDb(db, async (c) => {
        await applyMigrations(c);

        const snapshot = JSON.parse(
          await readFile(path.join(MIGRATIONS, "meta", "0000_snapshot.json"), "utf8"),
        ) as { tables: Record<string, { columns: Record<string, unknown> }> };

        const { rows } = await c.query<{ table_name: string; column_name: string }>(COLUMNS_QUERY);

        const actual = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
        const expected = new Set(
          Object.entries(snapshot.tables).flatMap(([table, def]) =>
            Object.keys(def.columns).map((col) => `${table.replace(/^public\./, "")}.${col}`),
          ),
        );

        expect([...expected].filter((k) => !actual.has(k))).toEqual([]);
      });
    } finally {
      await withAdmin((c) => c.query(`drop database if exists ${db} with (force)`));
    }
  }, 60_000);
});

describe("файлы миграций", () => {
  it("журнал согласован с наличием SQL-файлов", async () => {
    const journal = JSON.parse(
      await readFile(path.join(MIGRATIONS, "meta", "_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };

    expect(journal.entries.length).toBeGreaterThan(0);

    for (const entry of journal.entries) {
      await expect(
        readFile(path.join(MIGRATIONS, `${entry.tag}.sql`), "utf8"),
      ).resolves.toBeTruthy();
    }
  });

  it("baseline из seed.ts ссылается на существующую миграцию", async () => {
    const seed = await readFile(path.join(process.cwd(), "src/db/seed.ts"), "utf8");
    const tag = seed.match(/BASELINE_TAG\s*=\s*"([^"]+)"/)?.[1];

    expect(tag, "BASELINE_TAG не найден в seed.ts").toBeTruthy();
    await expect(readFile(path.join(MIGRATIONS, `${tag}.sql`), "utf8")).resolves.toBeTruthy();
  });
});
