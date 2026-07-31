import { getActivity, getOrdersLite } from "@/server/queries";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [activity, orders] = await Promise.all([getActivity(), getOrdersLite()]);

  const items = [
    ...orders.slice(0, 6).map((o) => ({
      id: `o${o.id}`,
      title: `Новый заказ ${o.number}`,
      body: `${o.customer ?? "Клиент"} · ${o.channel} · ${o.total} сум`,
      channel: "telegram",
      status: "delivered",
      color: "#22c55e",
      at: String(o.createdAt),
    })),
    ...activity.map((a) => ({
      id: `a${a.id}`,
      title: a.actor,
      body: `${a.action} — ${a.entity}`,
      channel: "internal",
      status: "read",
      color: "#8b5cf6",
      at: String(a.createdAt),
    })),
    {
      id: "w1",
      title: "Низкий остаток на складе",
      body: "DELIS Glass Cleaner Crystal — 12 шт, ниже минимума",
      channel: "push",
      status: "delivered",
      color: "#f97316",
      at: new Date(Date.now() - 3600e3).toISOString(),
    },
    {
      id: "w2",
      title: "Агент выполнил план",
      body: "Шохрух Абдуллаев закрыл месяц на 112%",
      channel: "email",
      status: "sent",
      color: "#3b82f6",
      at: new Date(Date.now() - 7200e3).toISOString(),
    },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return <NotificationsClient items={items} />;
}
