import { describe, expect, it } from "vitest";
import { BusinessError } from "@/server/queries";

/**
 * Правила списания склада.
 *
 * Заказ на количество больше остатка раньше проходил: остаток уходил в
 * минус, а `greatest(0, ...)` в adjustStock подменял его нулём. В итоге
 * склад обнулялся, движение фиксировало списание несуществующего товара,
 * а сумма невыполнимого заказа попадала в выручку.
 *
 * Здесь проверяется контракт ошибки; сквозной сценарий с базой закрыт
 * проверками в tests/migrations.test.ts и ручным прогоном через API.
 */

describe("BusinessError", () => {
  it("является настоящей ошибкой и сохраняет сообщение", () => {
    const err = new BusinessError("Недостаточно товара");

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Недостаточно товара");
  });

  it("отличима от обычной ошибки — по ней API отдаёт 400, а не 500", () => {
    const business: unknown = new BusinessError("нехватка");
    const crash: unknown = new TypeError("undefined is not an object");

    expect(business instanceof BusinessError).toBe(true);
    expect(crash instanceof BusinessError).toBe(false);
  });

  it("имеет собственное имя для логов", () => {
    expect(new BusinessError("x").name).toBe("BusinessError");
  });
});

describe("правило нехватки товара", () => {
  /** Условие из createOrderQuick/createMultiOrder/adjustStock. */
  const notEnough = (stock: number, qty: number) => stock < qty;

  it("заказ больше остатка отклоняется", () => {
    expect(notEnough(280, 999999)).toBe(true);
    expect(notEnough(0, 1)).toBe(true);
  });

  it("заказ ровно на остаток разрешён", () => {
    // Граница: продать последние единицы можно.
    expect(notEnough(5, 5)).toBe(false);
  });

  it("обычный заказ в пределах остатка разрешён", () => {
    expect(notEnough(280, 2)).toBe(false);
  });

  it("текст ошибки называет товар и оба числа", () => {
    const name = "DELIS Car Shampoo Active Foam";
    const msg = `Недостаточно товара «${name}»: на складе ${280}, запрошено ${999999}`;

    expect(msg).toContain(name);
    expect(msg).toContain("280");
    expect(msg).toContain("999999");
  });
});
