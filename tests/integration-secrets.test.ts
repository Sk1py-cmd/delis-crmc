import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("секреты интеграций", () => {
  it("страница получает только безопасный DTO", async () => {
    const page = await readFile(
      path.join(process.cwd(), "src/app/(crm)/integrations/page.tsx"),
      "utf8",
    );

    expect(page).toContain("getIntegrationsForClient");
    expect(page).not.toMatch(/getIntegrations\(\)/);
  });

  it("секретные поля не копируются в клиентский DTO", async () => {
    const queries = await readFile(
      path.join(process.cwd(), "src/server/queries.ts"),
      "utf8",
    );
    const start = queries.indexOf("export async function getIntegrationsForClient");
    const end = queries.indexOf("export async function saveIntegration", start);
    const dto = queries.slice(start, end);

    expect(dto).toContain("configuredSecrets");
    expect(dto).toContain("spec.public");
    expect(dto).not.toMatch(/credentials:\s*integration\.credentials/);
  });

  it("пустой секрет сохраняет прежнее значение", async () => {
    const queries = await readFile(
      path.join(process.cwd(), "src/server/queries.ts"),
      "utf8",
    );
    const start = queries.indexOf("export async function saveIntegration");
    const end = queries.indexOf("export async function testTelegramBot", start);
    const save = queries.slice(start, end);

    expect(save).toMatch(/if \(next\) credentials\[key\] = next/);
    expect(save).toContain("existing.credentials");
  });

  it("Telegram-токен берётся только из env и не вводится в CRM", async () => {
    const [queries, settings, manage] = await Promise.all([
      readFile(path.join(process.cwd(), "src/server/queries.ts"), "utf8"),
      readFile(path.join(process.cwd(), "src/app/(crm)/settings/SettingsClient.tsx"), "utf8"),
      readFile(path.join(process.cwd(), "src/app/api/manage/route.ts"), "utf8"),
    ]);

    expect(queries).toContain("process.env.TELEGRAM_BOT_TOKEN");
    expect(queries).not.toMatch(/const token = tg\?\.credentials\?\.token/);
    expect(settings).not.toContain("tgToken");
    expect(settings).not.toContain("AAExxxxx");
    expect(manage).not.toMatch(/str\(d\.token\)/);
    expect(manage).toContain("delete credentials.token");
  });
});
