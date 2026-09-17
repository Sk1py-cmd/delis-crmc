const CHECK_LABELS = {
  install: "Установка зависимостей",
  audit: "Уязвимости зависимостей",
  secrets: "Секреты в репозитории",
  lint: "ESLint",
  typecheck: "TypeScript",
  unit: "Юнит-тесты",
  integration: "PostgreSQL-тесты",
  build: "Production-сборка",
  health: "Production health",
  auth: "Защита закрытых страниц",
  leaks: "Утечки в публичном ответе",
} as const;

type CheckKey = keyof typeof CHECK_LABELS;
type CheckStatus = "pass" | "fail" | "skipped";

export interface SecurityCheck {
  key: CheckKey;
  status: CheckStatus;
  detail?: string;
}

export interface SecurityReport {
  generatedAt: string;
  commit: string;
  runUrl: string;
  checks: SecurityCheck[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function limitedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseSecurityReport(value: unknown): SecurityReport {
  if (!isObject(value) || !Array.isArray(value.checks)) throw new Error("Некорректный отчёт");

  const generatedAt = limitedString(value.generatedAt, 40);
  const commit = limitedString(value.commit, 40);
  const runUrl = limitedString(value.runUrl, 300);
  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) throw new Error("Некорректная дата отчёта");
  if (!/^[0-9a-f]{7,40}$/i.test(commit)) throw new Error("Некорректный commit");
  if (!/^https:\/\/github\.com\/Sk1py-cmd\/delis-crmc\/actions\/runs\/\d+$/.test(runUrl)) {
    throw new Error("Некорректная ссылка на запуск");
  }

  const seen = new Set<CheckKey>();
  const checks = value.checks.map((raw): SecurityCheck => {
    if (!isObject(raw)) throw new Error("Некорректная проверка");
    const key = limitedString(raw.key, 30) as CheckKey;
    const status = limitedString(raw.status, 20) as CheckStatus;
    if (!(key in CHECK_LABELS) || seen.has(key)) throw new Error("Неизвестная или повторная проверка");
    if (!["pass", "fail", "skipped"].includes(status)) throw new Error("Некорректный статус");
    seen.add(key);
    return { key, status, detail: limitedString(raw.detail, 120) || undefined };
  });

  if (checks.length === 0 || checks.length > Object.keys(CHECK_LABELS).length) {
    throw new Error("Некорректное число проверок");
  }

  return { generatedAt, commit, runUrl, checks };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}

export function formatSecurityReport(report: SecurityReport): string {
  const failed = report.checks.filter((check) => check.status === "fail").length;
  const skipped = report.checks.filter((check) => check.status === "skipped").length;
  const overall = failed > 0
    ? `❌ Найдено проблем: ${failed}`
    : skipped > 0
      ? `⚠️ Пропущено проверок: ${skipped}`
      : "✅ Всё в порядке";
  const date = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tashkent",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(report.generatedAt));

  const lines = report.checks.map((check) => {
    const icon = check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⚠️";
    const detail = check.detail ? ` — ${escapeHtml(check.detail)}` : "";
    return `${icon} ${CHECK_LABELS[check.key]}${detail}`;
  });

  return [
    "🛡 <b>DELIS CRM — проверка безопасности</b>",
    "",
    `<b>Итог:</b> ${overall}`,
    `📅 ${escapeHtml(date)}`,
    `🔖 Commit: <code>${escapeHtml(report.commit.slice(0, 7))}</code>`,
    "",
    ...lines,
    "",
    `<a href="${escapeHtml(report.runUrl)}">Открыть отчёт GitHub Actions</a>`,
  ].join("\n");
}
