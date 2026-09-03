import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canAccess } from "@/shared/config/nav";

/**
 * Регрессия: REST-маршруты проверяли только факт входа, но не роль.
 *
 * Страницы были закрыты через layout, а API — нет, и получалась дыра:
 * раздел не виден в меню и не открывается по ссылке, но тот же набор
 * действий выполнялся обычным запросом. Воспроизводилось на живом стенде:
 * агент создавал и удалял товары, поддержка списывала остатки со склада,
 * агент читал чужую переписку и писал в неё от имени администрации.
 *
 * Здесь две проверки:
 *   1) матрица прав — какая роль какой раздел не должна открывать;
 *   2) статический разбор роутов: каждый обработчик обязан вызывать
 *      requireApiAccess, иначе новый маршрут снова уедет без прав.
 */

const routeSource = (rel: string) =>
  readFileSync(path.join(process.cwd(), "src/app/api", rel), "utf8");

/** Разделы, к которым привязаны маршруты. */
const GUARDED: [string, string][] = [
  ["products/route.ts", "/products"],
  ["orders/route.ts", "/orders"],
  ["orders/[id]/route.ts", "/orders"],
  ["messages/route.ts", "/chat"],
  ["agent-messages/route.ts", "/agents"],
  ["company-os/route.ts", "/company-os"],
];

describe("права REST-маршрутов", () => {
  it.each(GUARDED)("%s защищён через requireApiAccess", (file, section) => {
    const src = routeSource(file);

    expect(src).toContain("requireApiAccess");
    expect(src).toContain(`"${section}"`);
  });

  it.each(GUARDED)("%s не полагается на голый getSessionUser", (file) => {
    const src = routeSource(file);

    // Прямой вызов означал бы проверку «вошёл» без проверки роли —
    // ровно та дыра, которую закрывали.
    expect(src).not.toMatch(/const\s+\w+\s*=\s*await\s+getSessionUser\(\)/);
  });

  it("каждый экспортируемый обработчик вызывает guard", () => {
    for (const [file] of GUARDED) {
      const src = routeSource(file);
      const handlers = src.match(/export async function (GET|POST|PUT|PATCH|DELETE)/g) ?? [];
      const guards = src.match(/requireApiAccess\(/g) ?? [];

      expect(guards.length, `${file}: обработчиков ${handlers.length}`).toBeGreaterThanOrEqual(
        handlers.length,
      );
    }
  });
});

describe("матрица ролей закрывает найденные дыры", () => {
  it("агент не имеет доступа к товарам и складу", () => {
    // Через API он создавал и удалял товары.
    expect(canAccess("agent", "/products")).toBe(false);
    expect(canAccess("agent", "/warehouse")).toBe(false);
  });

  it("поддержка не имеет доступа к складу", () => {
    // Через API списывала остатки.
    expect(canAccess("support", "/warehouse")).toBe(false);
    expect(canAccess("support", "/products")).toBe(false);
  });

  it("агент не видит сводку компании с выручкой", () => {
    expect(canAccess("agent", "/company-os")).toBe(false);
  });

  it("склад не лезет в клиентский чат, поддержка — может", () => {
    expect(canAccess("warehouse", "/chat")).toBe(false);
    expect(canAccess("support", "/chat")).toBe(true);
  });

  it("роли сохраняют доступ к своим разделам", () => {
    // Фикс не должен ничего сломать в штатной работе.
    expect(canAccess("agent", "/orders")).toBe(true);
    expect(canAccess("agent", "/agents")).toBe(true);
    expect(canAccess("warehouse", "/warehouse")).toBe(true);
    expect(canAccess("warehouse", "/products")).toBe(true);
    expect(canAccess("support", "/orders")).toBe(true);
    expect(canAccess("manager", "/products")).toBe(true);
  });

  it("owner и admin сохраняют полный доступ", () => {
    for (const section of ["/products", "/warehouse", "/company-os", "/chat", "/orders"]) {
      expect(canAccess("owner", section)).toBe(true);
      expect(canAccess("admin", section)).toBe(true);
    }
  });
});

describe("диалоги агентов", () => {
  const src = routeSource("agent-messages/route.ts");

  it("проверяет принадлежность диалога", () => {
    // agentId приходил из запроса и не сверялся с текущим пользователем.
    expect(src).toContain("canUseThread");
  });

  it("fromAdmin вычисляется по роли, а не берётся от клиента", () => {
    // Иначе агент отправляет сообщения от имени администрации.
    expect(src).toMatch(/fromAdmin\s*=\s*guard\.user\.role\s*!==\s*"agent"/);
  });
});
