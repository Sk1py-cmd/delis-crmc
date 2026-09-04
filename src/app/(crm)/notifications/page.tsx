import { getActivity, getOrdersLite } from "@/server/queries";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

type Activity = Awaited<ReturnType<typeof getActivity>>;
type OrdersLite = Awaited<ReturnType<typeof getOrdersLite>>;

/**
 * Сборка ленты уведомлений вынесена из компонента: обращение к Date.now()
 * внутри рендера нарушает правила чистоты React (react-hooks/purity).
 */
function buildItems(activity: Activity, orders: OrdersLite) {
  return [
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
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default async function NotificationsPage() {
  const [activity, orders] = await Promise.all([getActivity(), getOrdersLite()]);
  const items = buildItems(activity, orders);

  return <NotificationsClient items={items} />;
}
