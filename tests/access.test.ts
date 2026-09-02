import { describe, expect, it } from "vitest";
import { canAccess, navForRole, ROLE_ACCESS, NAV, isKnownRole } from "@/shared/config/nav";
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

  it("неизвестная роль не получает доступ к закрытым разделам", () => {
    // Политика fail-closed: роли без записи в ROLE_ACCESS остаются только
    // главная и настройки. Раньше такая роль видела всё, включая финансы.
    expect(canAccess("новая_роль", "/finance")).toBe(false);
    expect(canAccess("новая_роль", "/users")).toBe(false);
    expect(canAccess("", "/finance")).toBe(false);
  });

  it("неизвестной роли остаются главная и настройки", () => {
    expect(canAccess("новая_роль", "/")).toBe(true);
    expect(canAccess("новая_роль", "/settings")).toBe(true);
  });

  it("isKnownRole отличает настоящие роли от произвольных", () => {
    expect(isKnownRole("owner")).toBe(true);
    expect(isKnownRole("warehouse")).toBe(true);
    expect(isKnownRole("суперадмин")).toBe(false);
    expect(isKnownRole("")).toBe(false);
  });
});

describe("navForRole", () => {
  it("owner получает полное меню", () => {
    expect(navForRole("owner")).toHaveLength(NAV.length);
  });

  it("меню неизвестной роли не содержит финансов", () => {
    const hrefs = navForRole("новая_роль").map((n) => n.href);
    expect(hrefs).not.toContain("/finance");
    expect(hrefs).not.toContain("/users");
    expect(hrefs.length).toBeLessThan(NAV.length);
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
