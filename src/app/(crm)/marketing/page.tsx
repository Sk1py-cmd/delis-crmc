import { getMarketingData } from "@/server/queries";
import { MarketingClient } from "./MarketingClient";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const data = await getMarketingData();

  return (
    <MarketingClient
      promos={data.promos.map((p) => ({
        id: p.id,
        code: p.code,
        discountType: p.discountType,
        discountValue: String(p.discountValue),
        minOrderAmount: String(p.minOrderAmount),
        maxUses: p.maxUses,
        usedCount: p.usedCount,
        status: p.status,
        validUntil: p.validUntil ? String(p.validUntil) : null,
        createdAt: String(p.createdAt),
      }))}
      triggers={data.triggers.map((t) => ({
        id: t.id,
        title: t.title,
        eventKey: t.eventKey,
        actionType: t.actionType,
        messageBody: t.messageBody,
        discountBonus: t.discountBonus,
        isActive: t.isActive,
        triggeredCount: t.triggeredCount,
      }))}
      campaigns={data.campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        channel: c.channel,
        recipients: c.recipients,
        delivered: c.delivered,
        status: c.status,
        createdAt: String(c.createdAt),
      }))}
      adChannels={data.adChannels}
      totalSales={data.totalSales}
      ordersCount={data.ordersCount}
    />
  );
}
