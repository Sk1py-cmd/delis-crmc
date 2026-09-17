import { describe, expect, it } from "vitest";
import { formatSecurityReport, parseSecurityReport } from "@/server/security-report";

const valid = {
  generatedAt: "2026-09-17T08:00:00.000Z",
  commit: "a2df0584054514c6a2a76412a090ab50ed209b90",
  runUrl: "https://github.com/Sk1py-cmd/delis-crmc/actions/runs/123456",
  checks: [
    { key: "lint", status: "pass", detail: "ошибок нет" },
    { key: "leaks", status: "fail", detail: "<token>" },
  ],
};

describe("Telegram security report", () => {
  it("валидирует и безопасно форматирует отчёт", () => {
    const text = formatSecurityReport(parseSecurityReport(valid));
    expect(text).toContain("Найдено проблем: 1");
    expect(text).toContain("&lt;token&gt;");
    expect(text).not.toContain("<token>");
    expect(text).toContain("actions/runs/123456");
  });

  it("не принимает ссылку на чужой репозиторий", () => {
    expect(() => parseSecurityReport({ ...valid, runUrl: "https://github.com/evil/repo/actions/runs/1" })).toThrow("ссылка");
  });

  it("не принимает повторные проверки", () => {
    expect(() => parseSecurityReport({ ...valid, checks: [valid.checks[0], valid.checks[0]] })).toThrow("повторная");
  });
});
