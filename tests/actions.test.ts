import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACTION_POLICY, DENY_MESSAGE } from "@/shared/config/actions";
import { canAccess, NAV, ROLE_ACCESS } from "@/shared/config/nav";

/**
 * Права на действия `/api/manage`.
 *
 * Раньше проверку имели 8 действий из 45: агент мог записать расход в
 * финансы через API, хотя раздел /finance ему недоступен. Здесь
 * проверяется, что карта прав покрывает все действия роута и что
 * чувствительные операции закрыты.
 */

const ROUTE = readFileSync(
  path.join(process.cwd(), "src/app/api/manage/route.ts"),
  "utf8",
);

/** Действия, реально обрабатываемые роутом. */
const routeActions = [...ROUTE.matchAll(/case "(\w+)"/g)].map((m) => m[1]);

/** Решение роута для роли: повторяет проверку в route.ts. */
function allowed(role: string, action: string): boolean {
  const policy = ACTION_POLICY[action];
  if (!policy) return false;
  if (policy === "admin") return role === "owner" || role === "admin";
  if (policy === "self") return true;
  return canAccess(role, policy);
}

describe("карта прав покрывает роут", () => {
  it("у каждого действия роута есть политика", () => {
    const missing = routeActions.filter((a) => !ACTION_POLICY[a]);

    expect(missing).toEqual([]);
  });

  it("в карте нет действий, которых нет в роуте", () => {
    const extra = Object.keys(ACTION_POLICY).filter((a) => !routeActions.includes(a));

    expect(extra).toEqual([]);
  });

  it("политики по разделам ссылаются на существующие пункты меню", () => {
    const hrefs = new Set(NAV.map((n) => n.href));
    const bad = Object.entries(ACTION_POLICY)
      .filter(([, p]) => p !== "admin" && p !== "self")
      .filter(([, p]) => !hrefs.has(p));

    expect(bad).toEqual([]);
  });

  it("тексты отказов заданы только для существующих действий", () => {
    const bad = Object.keys(DENY_MESSAGE).filter((a) => !ACTION_POLICY[a]);

    expect(bad).toEqual([]);
  });
});

describe("owner и admin", () => {
  it.each(["owner", "admin"])("%s может всё", (role) => {
    const denied = routeActions.filter((a) => !allowed(role, a));

    expect(denied).toEqual([]);
  });
});

describe("деньги и рассылки закрыты для рядовых ролей", () => {
  const sensitive = [
    "addTransaction",
    "createPurchaseOrder",
    "receivePurchaseOrder",
    "approveReturn",
    "sendBroadcast",
    "sendPush",
    "publishSite",
    "createPromocode",
    "saveIntegration",
    "resetOperationalData",
    "createUser",
    "deleteUser",
  ];

  const roles = Object.keys(ROLE_ACCESS);

  it.each(roles)("роль %s не имеет доступа к чувствительным действиям", (role) => {
    const leaked = sensitive.filter((a) => allowed(role, a));

    expect(leaked).toEqual([]);
  });

  it("агент больше не может записать расход в финансы", () => {
    // Ровно тот вызов, который проходил до фикса.
    expect(allowed("agent", "addTransaction")).toBe(false);
  });

  it("неизвестная роль не может ничего, кроме действий над собой", () => {
    const leaked = routeActions
      .filter((a) => ACTION_POLICY[a] !== "self")
      .filter((a) => allowed("новая_роль", a));

    expect(leaked).toEqual([]);
  });
});

describe("рабочие роли сохраняют свои действия", () => {
  it("склад проводит инвентаризацию и заводит поставщиков", () => {
    expect(allowed("warehouse", "inventory")).toBe(true);
    expect(allowed("warehouse", "createSupplier")).toBe(true);
  });

  it("агент работает с визитами и заказами торговых точек", () => {
    expect(allowed("agent", "addAgentVisit")).toBe(true);
    expect(allowed("agent", "createAgentStoreOrder")).toBe(true);
  });

  it("поддержка оформляет возврат, но не одобряет его", () => {
    expect(allowed("support", "createReturn")).toBe(true);
    expect(allowed("support", "approveReturn")).toBe(false);
  });

  it("менеджер ведёт задачи и товары", () => {
    expect(allowed("manager", "createTask")).toBe(true);
    expect(allowed("manager", "importProducts")).toBe(true);
  });

  it("любая роль может сменить себе пароль", () => {
    for (const role of Object.keys(ROLE_ACCESS)) {
      expect(allowed(role, "changePassword")).toBe(true);
    }
  });

  it("склад не лезет в чужие разделы", () => {
    expect(allowed("warehouse", "createInstagramPost")).toBe(false);
    expect(allowed("warehouse", "sendOrderToClient")).toBe(false);
  });
});
