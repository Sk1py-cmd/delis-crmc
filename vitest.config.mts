import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Часть модулей (например, src/db) требует DATABASE_URL уже на импорте.
loadEnv();

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Тесты, работающие с БД, делят одну схему — гоняем файлы последовательно.
    fileParallelism: false,
  },
});
