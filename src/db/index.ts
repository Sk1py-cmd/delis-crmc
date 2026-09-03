import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Подключение к БД создаётся лениво — при первом обращении, а не на импорте.
 *
 * Раньше `throw` стоял на верхнем уровне модуля, поэтому любой импорт цепочки
 * (`@/server/queries` → `@/db`) требовал DATABASE_URL. Из-за этого юнит-тесты,
 * которым нужна лишь константа вроде TASK_STATUSES или класс BusinessError,
 * падали без базы, и `npm test` в CI выглядел сломанным.
 *
 * Отсутствие переменной по-прежнему ошибка — просто выясняется она в момент
 * реального запроса, а не при разборе модулей.
 */

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: NodePgDatabase;
};

function connect(): NodePgDatabase {
  if (globalForDb.__arenaNextJsPostgresqlDb) {
    return globalForDb.__arenaNextJsPostgresqlDb;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: databaseUrl });
  const instance = drizzle(pool);

  // В dev держим пул в globalThis: иначе hot reload плодит подключения.
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
    globalForDb.__arenaNextJsPostgresqlDb = instance;
  }

  return instance;
}

/** Пул подключений. Создаётся при первом вызове. */
export function getPool(): Pool {
  connect();
  return globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
}

/**
 * Прокси поверх drizzle: обращение к любому методу (`select`, `insert`,
 * `execute`, …) инициализирует подключение. Для вызывающего кода выглядит
 * и работает как обычный экземпляр drizzle.
 */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    const instance = connect();
    const value = Reflect.get(instance as object, prop, receiver);

    return typeof value === "function" ? value.bind(instance) : value;
  },
});
