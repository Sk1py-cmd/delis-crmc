import { getBroadcastData } from "@/server/queries";
import { requireAccess } from "@/server/guard";
import { BroadcastClient } from "./BroadcastClient";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const session = await requireAccess("/broadcast");
  const data = await getBroadcastData();
  return (
    <BroadcastClient
      operator={session?.name ?? "Менеджер"}
      customers={data.customers.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        firstName: c.firstName,
        username: c.username,
        city: c.city,
        source: c.source,
        isVip: c.isVip,
        bonus: c.bonus,
        ordersCount: c.ordersCount,
        totalSpent: Number(c.totalSpent),
        lastActiveAt: String(c.lastActiveAt),
      }))}
      templates={data.templates.map((t) => ({ id: t.id, title: t.title, body: t.body }))}
      history={data.history.map((h) => ({
        id: h.id,
        title: h.title,
        body: h.body,
        recipients: h.recipients,
        channel: h.channel,
        status: h.status,
        scheduledAt: h.scheduledAt ? String(h.scheduledAt) : null,
        sentAt: String(h.sentAt),
        createdBy: h.createdBy,
      }))}
    />
  );
}
