import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

/**
 * Регрессия: смена пароля не завершала уже выданные сессии.
 *
 * Старый пароль после сброса переставал работать, но украденная cookie
 * продолжала открывать разделы CRM — то есть смена пароля не решала ровно
 * ту задачу, ради которой её делают.
 *
 * Здесь проверяется поведение на стороне БД: каскад при удалении
 * пользователя и запросы, которыми приложение гасит сессии.
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

/** Заводит пользователя с двумя активными сессиями. */
async function seedUserWithSessions(c: Client, login: string) {
  const { rows } = await c.query(
    `insert into users (name, login, email, role, password_hash)
     values ($1, $2, $3, 'manager', 'x:y') returning id`,
    [login, login, `${login}@delis.uz`],
  );
  const userId = rows[0].id as number;

  for (const token of [`${login}-current`, `${login}-stolen`]) {
    await c.query(
      `insert into sessions (token, user_id, expires_at) values ($1, $2, now() + interval '30 days')`,
      [token, userId],
    );
  }

  return userId;
}

const countSessions = async (c: Client, userId: number) =>
  Number((await c.query(`select count(*) from sessions where user_id = $1`, [userId])).rows[0].count);

describe.skipIf(!url)("сессии", () => {
  it("админский сброс пароля гасит все сессии пользователя", async () => {
    await withFreshDb("t_sess_reset", async (c) => {
      const userId = await seedUserWithSessions(c, "victim");
      expect(await countSessions(c, userId)).toBe(2);

      // revokeUserSessions(userId) без исключения токена.
      await c.query(`delete from sessions where user_id = $1`, [userId]);

      expect(await countSessions(c, userId)).toBe(0);
    });
  });

  it("смена своего пароля оставляет текущую вкладку, гасит остальные", async () => {
    await withFreshDb("t_sess_self", async (c) => {
      const userId = await seedUserWithSessions(c, "selfuser");

      // revokeUserSessions(userId, currentToken).
      await c.query(`delete from sessions where user_id = $1 and token <> $2`, [
        userId,
        "selfuser-current",
      ]);

      const { rows } = await c.query(`select token from sessions where user_id = $1`, [userId]);
      expect(rows).toHaveLength(1);
      expect(rows[0].token).toBe("selfuser-current");
    });
  });

  it("удаление пользователя каскадом уносит его сессии", async () => {
    await withFreshDb("t_sess_cascade", async (c) => {
      const userId = await seedUserWithSessions(c, "goner");

      // Каскад на уровне БД: работает даже в обход приложения.
      await c.query(`delete from users where id = $1`, [userId]);

      expect(await countSessions(c, userId)).toBe(0);
    });
  });

  it("осиротевшую сессию нельзя создать в обход приложения", async () => {
    await withFreshDb("t_sess_fk", async (c) => {
      await expect(
        c.query(
          `insert into sessions (token, user_id, expires_at) values ('ghost', 999999, now() + interval '1 day')`,
        ),
      ).rejects.toThrow(/foreign key|violates/i);
    });
  });

  it("истёкшие сессии удаляются чисткой, активные остаются", async () => {
    await withFreshDb("t_sess_purge", async (c) => {
      const userId = await seedUserWithSessions(c, "olduser");
      await c.query(
        `insert into sessions (token, user_id, expires_at) values ('expired', $1, now() - interval '1 day')`,
        [userId],
      );

      await c.query(`delete from sessions where expires_at < now()`);

      const { rows } = await c.query(`select token from sessions where user_id = $1 order by token`, [
        userId,
      ]);
      expect(rows.map((r) => r.token)).toEqual(["olduser-current", "olduser-stolen"]);
    });
  });
});
