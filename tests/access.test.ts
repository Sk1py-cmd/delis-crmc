import { describe, expect, it } from "vitest";
import { canAccess, navForRole, ROLE_ACCESS, NAV } from "@/shared/config/nav";
import { canManageUsers } from "@/server/auth";

describe("canAccess", () => {
  it("owner и admin имеют доступ ко всем разделам", () => {
    for (const item of NAV) {
      expect(canAccess("owner", item.href)).toBe(true);
      expect(canAccess("admin", item.href)).toBe(true);
    }
  });

  it("склад не видит финансовые разделы", () => {
    // Себестоимость и прибыль не должны утекать кладовщику.
    expect(canAccess("warehouse", "/finance")).toBe(false);
    expect(canAccess("warehouse", "/pnl")).toBe(false);
    expect(canAccess("warehouse", "/users")).toBe(false);
  });

  it("склад видит свои разделы", () => {
    expect(canAccess("warehouse", "/warehouse")).toBe(true);
    expect(canAccess("warehouse", "/products")).toBe(true);
  });

  it("агент не видит склад, финансы и управление пользователями", () => {
    expect(canAccess("agent", "/warehouse")).toBe(false);
    expect(canAccess("agent", "/finance")).toBe(false);
    expect(canAccess("agent", "/users")).toBe(false);
  });

  it("поддержка не имеет доступа к финансам и товарам", () => {
    expect(canAccess("support", "/finance")).toBe(false);
    expect(canAccess("support", "/products")).toBe(false);
  });

  it("ни одна ограниченная роль не имеет доступа к /users и /finance", () => {
    for (const role of Object.keys(ROLE_ACCESS)) {
      expect(canAccess(role, "/users"), `роль ${role}`).toBe(false);
      expect(canAccess(role, "/finance"), `роль ${role}`).toBe(false);
    }
  });

  it("все роли имеют доступ к дашборду и настройкам", () => {
    for (const role of Object.keys(ROLE_ACCESS)) {
      expect(canAccess(role, "/"), `роль ${role}`).toBe(true);
      expect(canAccess(role, "/settings"), `роль ${role}`).toBe(true);
    }
  });

  it("ЗАФИКСИРОВАНО: неизвестная роль получает полный доступ", () => {
    // Текущее поведение — fail-open: роль без записи в ROLE_ACCESS видит всё.
    // Тест закрепляет это как осознанное решение; если политику поменяют
    // на fail-closed, тест упадёт и напомнит обновить ожидание.
    expect(canAccess("новая_роль", "/finance")).toBe(true);
  });
});

describe("navForRole", () => {
  it("owner получает полное меню", () => {
    expect(navForRole("owner")).toHaveLength(NAV.length);
  });

  it("ограниченная роль получает урезанное меню", () => {
    const nav = navForRole("warehouse");

    expect(nav.length).toBeGreaterThan(0);
    expect(nav.length).toBeLessThan(NAV.length);
  });

  it("меню согласовано с canAccess", () => {
    // Пункт в меню не должен вести на страницу, которую guard заблокирует.
    for (const role of Object.keys(ROLE_ACCESS)) {
      for (const item of navForRole(role)) {
        expect(canAccess(role, item.href), `${role} -> ${item.href}`).toBe(true);
      }
    }
  });

  it("в ROLE_ACCESS нет ссылок на несуществующие разделы", () => {
    const known = new Set(NAV.map((n) => n.href));

    for (const [role, hrefs] of Object.entries(ROLE_ACCESS)) {
      for (const href of hrefs) {
        expect(known.has(href), `${role} ссылается на неизвестный ${href}`).toBe(true);
      }
    }
  });
});

describe("canManageUsers", () => {
  it("разрешено только owner и admin", () => {
    expect(canManageUsers("owner")).toBe(true);
    expect(canManageUsers("admin")).toBe(true);
  });

  it("остальным ролям запрещено", () => {
    for (const role of ["manager", "warehouse", "agent", "support", "operator", ""]) {
      expect(canManageUsers(role), `роль ${role}`).toBe(false);
    }
  });
});
