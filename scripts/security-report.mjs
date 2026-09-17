import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const checks = [];
const productionUrl = (process.env.PRODUCTION_URL || "https://delis-crmc-beta.vercel.app").replace(/\/$/, "");

function run(key, command, args, detail) {
  console.log(`\n::group::${key}`);
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  console.log("::endgroup::");
  checks.push({ key, status: result.status === 0 ? "pass" : "fail", ...(detail ? { detail } : {}) });
  return result.status === 0;
}

function skip(key, detail) {
  checks.push({ key, status: "skipped", detail });
}

function auditDependencies() {
  const result = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", env: process.env });
  try {
    const audit = JSON.parse(result.stdout || "{}");
    const counts = audit.metadata?.vulnerabilities;
    if (!counts || typeof counts !== "object") throw new Error("missing metadata");
    const high = Number(counts.high || 0);
    const critical = Number(counts.critical || 0);
    checks.push({
      key: "audit",
      status: high + critical === 0 ? "pass" : "fail",
      detail: `high: ${high}, critical: ${critical}`,
    });
  } catch {
    checks.push({ key: "audit", status: "fail", detail: "npm audit не вернул корректный JSON" });
  }
}

function scanTrackedFiles() {
  const filesResult = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  if (filesResult.status !== 0) {
    checks.push({ key: "secrets", status: "fail", detail: "git ls-files завершился ошибкой" });
    return;
  }
  const patterns = [
    /\b\d{8,12}:[A-Za-z0-9_-]{35}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];
  let matches = 0;
  for (const file of filesResult.stdout.split("\0").filter(Boolean)) {
    if (file === "package-lock.json" || file.startsWith("public/uploads/")) continue;
    try {
      const content = readFileSync(file, "utf8");
      if (patterns.some((pattern) => pattern.test(content))) matches += 1;
    } catch {
      // Бинарный или удалённый между ls-files/readFile файл не считаем утечкой.
    }
  }
  checks.push({
    key: "secrets",
    status: matches === 0 ? "pass" : "fail",
    detail: matches === 0 ? "совпадений нет" : `подозрительных файлов: ${matches}`,
  });
}

async function productionChecks() {
  try {
    const health = await fetch(`${productionUrl}/api/health`, { signal: AbortSignal.timeout(15_000) });
    const body = await health.json().catch(() => null);
    checks.push({ key: "health", status: health.ok && body?.ok === true ? "pass" : "fail", detail: `HTTP ${health.status}` });
  } catch (error) {
    checks.push({ key: "health", status: "fail", detail: error instanceof Error ? error.message : "ошибка сети" });
  }

  const paths = ["/", "/integrations", "/customers"];
  let authOk = true;
  let leakFound = false;
  const leakPatterns = [
    /\b\d{8,12}:[A-Za-z0-9_-]{35}\b/,
    /"credentials"\s*:/i,
    /"ownerChatId"\s*:/i,
  ];

  for (const path of paths) {
    for (const rsc of [false, true]) {
      try {
        const response = await fetch(`${productionUrl}${path}${rsc ? "?_rsc=security" : ""}`, {
          redirect: "manual",
          headers: rsc ? { RSC: "1" } : {},
          signal: AbortSignal.timeout(15_000),
        });
        const location = response.headers.get("location") ?? "";
        const redirectsToLogin = [302, 303, 307, 308].includes(response.status)
          && new URL(location, productionUrl).pathname === "/login";
        authOk &&= redirectsToLogin;
        const text = await response.text();
        leakFound ||= leakPatterns.some((pattern) => pattern.test(text));
      } catch {
        authOk = false;
      }
    }
  }

  checks.push({ key: "auth", status: authOk ? "pass" : "fail", detail: `${paths.length} закрытых маршрута` });
  checks.push({ key: "leaks", status: leakFound ? "fail" : "pass", detail: leakFound ? "найден чувствительный шаблон" : "признаков утечки нет" });
}

async function getOidcToken() {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !requestToken) throw new Error("GitHub OIDC недоступен");
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}audience=delis-crm-security`, {
    headers: { Authorization: `Bearer ${requestToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json();
  if (!response.ok || typeof data.value !== "string") throw new Error("Не удалось получить GitHub OIDC token");
  return data.value;
}

async function sendReport(report) {
  const token = await getOidcToken();
  const endpoint = process.env.REPORT_ENDPOINT || `${productionUrl}/api/security-report`;
  let lastError = "";

  // При push Vercel может ещё разворачивать endpoint. Ждём до трёх минут.
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return;
      lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
      if (![404, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "ошибка сети";
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error(`Telegram-отчёт не отправлен: ${lastError}`);
}

const installed = run("install", "npm", ["ci"]);
scanTrackedFiles();
if (installed) {
  auditDependencies();
  run("lint", "npm", ["run", "lint"]);
  run("typecheck", "npm", ["run", "typecheck"]);
  run("unit", "npm", ["run", "test:unit"]);
  run("integration", "npm", ["run", "test:db"]);
  run("build", "npm", ["run", "build"]);
} else {
  for (const key of ["audit", "lint", "typecheck", "unit", "integration", "build"]) skip(key, "npm ci завершился ошибкой");
}

await productionChecks();

const report = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
  runUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  checks,
};

await sendReport(report);
if (checks.some((check) => check.status === "fail")) process.exitCode = 1;
