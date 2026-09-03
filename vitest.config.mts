import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv();

const alias = {
  "@": path.resolve(import.meta.dirname, "./src"),
};

/**
 * Тесты разделены на два проекта:
 *
 *   unit        — чистая логика, база не нужна. Запускаются всегда.
 *   integration — работают с реальным PostgreSQL из DATABASE_URL:
 *                 применяют миграции во временных базах, проверяют
 *                 уникальность номеров и последовательности.
 *
 * Без DATABASE_URL проект integration исключается целиком, а не падает
 * на импорте: `npm test` в CI без базы должен быть зелёным и честным,
 * а не «сломанным по умолчанию».
 *
 * Запуск только интеграционных: `npm run test:db`.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL);

const INTEGRATION = [
  "tests/migrations.test.ts",
  "tests/sequences.test.ts",
  "tests/sessions.test.ts",
];

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: INTEGRATION,
        },
      },
      ...(hasDatabase
        ? [
            {
              resolve: { alias },
              test: {
                name: "integration",
                environment: "node",
                include: INTEGRATION,
                // Делят один сервер БД — гоняем последовательно.
                fileParallelism: false,
              },
            },
          ]
        : []),
    ],
  },
});
