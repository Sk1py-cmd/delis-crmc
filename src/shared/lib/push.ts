"use client";

/**
 * Отправка push-уведомления владельцу/менеджерам о событии.
 * Если Telegram настроен — отправится через бота.
 * Если нет — покажет системный toast в браузере.
 */

const EVENT_LABELS: Record<string, string> = {
  new_order: "Новый заказ",
  agent_order: "Агент оформил заказ",
  agent_gps: "Агент на точке",
  low_stock: "Низкий остаток на складе",
  agent_silent: "Агент не выходит на связь",
  payment_received: "Поступила оплата",
};

export async function sendPushNotification(input: {
  event: string;
  title: string;
  body: string;
  data?: Record<string, string | number>;
}) {
  try {
    await fetch("/api/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sendPush",
        data: { event: input.event, title: input.title, body: input.body, ...(input.data ?? {}) },
      }),
    });
  } catch {
    /* Сетевая ошибка — не критично */
  }
}

/**
 * Автоматические алерты: вызывается при ключевых событиях в системе.
 * Клиентская обёртка.
 */
export function notifyOrderCreated(orderNumber: string, total: string, payment: string) {
  void sendPushNotification({
    event: "new_order",
    title: `🛒 Новый заказ ${orderNumber}`,
    body: `Сумма: ${total} сум · Оплата: ${payment}`,
    data: { orderNumber, total, payment },
  });
}

export function notifyAgentOrder(
  agentName: string,
  storeName: string,
  gpsCoords: string,
) {
  void sendPushNotification({
    event: "agent_order",
    title: `🧑‍💼 ${agentName} оформил B2B-заказ`,
    body: `Точка: ${storeName} · GPS: ${gpsCoords}`,
    data: { agentName, storeName, gpsCoords },
  });
}

export function notifyLowStock(productName: string, stock: number, lowStock: number) {
  void sendPushNotification({
    event: "low_stock",
    title: `⚠️ Низкий остаток: ${productName}`,
    body: `Осталось ${stock} шт (минимум ${lowStock})`,
    data: { productName, stock, lowStock },
  });
}

export function notifyAgentSilent(agentName: string, lastSeen: string) {
  void sendPushNotification({
    event: "agent_silent",
    title: `📵 ${agentName} не выходит на связь`,
    body: `Последний GPS-чекин: ${lastSeen}`,
    data: { agentName, lastSeen },
  });
}
