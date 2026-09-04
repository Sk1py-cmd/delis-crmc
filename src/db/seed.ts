import path from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";
import * as s from "@/db/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/server/password";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

let seeded: Promise<void> | null = null;

/**
 * Базовая (первая) миграция, соответствующая схеме, которую старая версия
 * приложения создавала «сырым» DDL прямо в рантайме.
 */
const BASELINE_TAG = "0000_living_shaman";

/**
 * Помечает базовую миграцию как применённую, не выполняя её.
 *
 * Нужно для баз, созданных старой версией приложения: таблицы там уже есть,
 * но журнала миграций нет, поэтому `migrate()` попытался бы выполнить
 * `CREATE TABLE` и упал бы с «relation already exists».
 */
async function baselineExistingDatabase() {
  const [{ has_tables: hasTables }] = (
    await db.execute<{ has_tables: boolean }>(sql`
      select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'products'
      ) as has_tables
    `)
  ).rows;

  if (!hasTables) return; // Чистая база — обычная миграция создаст всё сама.

  // Проверяем наличие таблицы журнала отдельным запросом: Postgres планирует
  // выражение целиком, поэтому ссылку на несуществующую таблицу нельзя
  // спрятать даже в невыполняемую ветку CASE.
  const [{ exists: journalExists }] = (
    await db.execute<{ exists: boolean }>(
      sql`select to_regclass('drizzle.__drizzle_migrations') is not null as exists`,
    )
  ).rows;

  if (journalExists) {
    // Важно смотреть именно на записи: прерванный `drizzle-kit migrate`
    // мог создать пустую таблицу журнала.
    const [{ applied }] = (
      await db.execute<{ applied: number }>(
        sql`select count(*)::int as applied from drizzle."__drizzle_migrations"`,
      )
    ).rows;

    if (applied > 0) return; // База уже под управлением миграций.
  }

  const file = await readFile(path.join(MIGRATIONS_DIR, `${BASELINE_TAG}.sql`), "utf8");
  const hash = createHash("sha256").update(file).digest("hex");
  const journal = JSON.parse(
    await readFile(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
  ) as { entries: { tag: string; when: number }[] };
  const when = journal.entries.find((e) => e.tag === BASELINE_TAG)?.when ?? Date.now();

  await db.execute(sql`create schema if not exists drizzle`);
  await db.execute(sql`
    create table if not exists drizzle."__drizzle_migrations" (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
  await db.execute(sql`
    insert into drizzle."__drizzle_migrations" (hash, created_at)
    values (${hash}, ${when})
  `);
}

/**
 * Приводит схему БД в актуальное состояние.
 *
 * Раньше таблицы создавались «сырым» DDL (`create table if not exists ...`)
 * прямо в рантайме: такой подход не умеет изменять уже существующие таблицы
 * и со временем расходится со `schema.ts`. Теперь источник правды —
 * сгенерированные миграции (`npm run db:generate`).
 */
async function createTables() {
  await baselineExistingDatabase();
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}

/**
 * Стартовые значения последовательностей: ниже них номера не опускаются
 * даже на пустой базе, чтобы новые записи не пересекались с историческими.
 */
const SEQUENCE_FLOOR = {
  order_number_seq: 24000,
  purchase_order_number_seq: 1200,
  product_sku_seq: 1000,
} as const;

/**
 * Подтягивает последовательности номеров к фактическому содержимому таблиц.
 *
 * Берём первую группу цифр: у разведённых дубликатов номер выглядит как
 * `DLS-24001-5`, и «все цифры подряд» дали бы 240015 — скачок на порядок.
 */
export async function syncNumberSequences() {
  const targets: [keyof typeof SEQUENCE_FLOOR, string, string][] = [
    ["order_number_seq", "orders", "number"],
    ["purchase_order_number_seq", "purchase_orders", "number"],
    ["product_sku_seq", "products", "sku"],
  ];

  for (const [seq, table, column] of targets) {
    await db.execute(sql`
      select setval(
        ${seq},
        greatest(
          ${SEQUENCE_FLOOR[seq]},
          coalesce(
            (select max((regexp_match(${sql.raw(column)}, '(\\d+)'))[1]::bigint)
               from ${sql.raw(table)}),
            0
          )
        )
      )
    `);
  }
}

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "delis2026";

async function ensureAdmin() {
  const hash = hashPassword(OWNER_PASSWORD);
  await db.execute(
    sql`insert into users (name, login, email, role, password_hash, two_fa)
        select 'Музаффар', 'owner', 'owner@delis.uz', 'owner', ${hash}, true
        where not exists (select 1 from users where login = 'owner')`,
  );
  // Обновляем строго аккаунт с login='owner': раньше условие цепляло и
  // строку с тем же email, из-за чего логин 'owner' получали две записи.
  await db.execute(
    sql`update users set password_hash = ${hash}, role = 'owner', two_fa = true where login = 'owner'`,
  );
}

/**
 * Базовые категории каталога. Это структура справочника, а не демо-данные:
 * без них форма товара и витрина Mini App не имеют таксономии.
 */
const CATEGORIES = [
  { name: "Home Care", slug: "home-care", kind: "home", icon: "🏠" },
  { name: "Auto Care", slug: "auto-care", kind: "auto", icon: "🚗" },
  { name: "Kitchen", slug: "kitchen", kind: "home", icon: "🍽️" },
  { name: "Bathroom", slug: "bathroom", kind: "home", icon: "🛁" },
  { name: "Laundry", slug: "laundry", kind: "home", icon: "🧺" },
];

async function ensureCategories() {
  const [{ count }] = (
    await db.execute<{ count: string }>(sql`select count(*)::text as count from categories`)
  ).rows;
  if (Number(count ?? "0") > 0) return;
  await db.insert(s.categories).values(CATEGORIES);
}

/**
 * Базовые интеграции. Строки-заглушки нужны разделу «Интеграции»: конфиг
 * клиента завязан на ключи (telegram_bot, click, …), и без них список
 * доступных подключений пуст.
 */
const INTEGRATIONS = [
  { key: "telegram_bot", title: "Telegram Bot" },
  { key: "click", title: "Click (платежи)" },
  { key: "payme", title: "Payme (платежи)" },
  { key: "uzum", title: "Uzum Bank (платежи)" },
  { key: "smtp", title: "Email / SMTP" },
  { key: "sms", title: "SMS-шлюз (Eskiz.uz)" },
];

async function ensureIntegrations() {
  for (const it of INTEGRATIONS) {
    await db.execute(sql`
      insert into integrations (key, title, enabled, status, credentials)
      select ${it.key}, ${it.title}, false, 'not_configured', '{}'::jsonb
      where not exists (select 1 from integrations where key = ${it.key})
    `);
  }
}

async function run() {
  await createTables();
  await ensureAdmin();
  // Протухшие сессии никто не удалял, а таблица читается на каждый запрос.
  // Запрос заинлайнен намеренно: auth.ts импортирует ensureSeed отсюда,
  // и обратный импорт замкнул бы модули в цикл.
  await db.execute(sql`delete from sessions where expires_at < now()`);
  await ensureCategories();
  await ensureIntegrations();
  // Держим счётчики номеров у стартовых значений: после очистки демо-данных
  // последовательности не должны продолжать расти относительно пустых таблиц.
  await syncNumberSequences();
}

export function ensureSeed() {
  if (!seeded) {
    seeded = run().catch((e) => {
      seeded = null;
      throw e;
    });
  }
  return seeded;
}
