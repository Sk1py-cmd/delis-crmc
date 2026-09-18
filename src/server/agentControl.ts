import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/db/seed";

export async function getAgentControlSummary() {
  await ensureSeed();

  const today = sql`current_date`;

  const orderAgg = await db
    .select({
      agentId: s.orders.agentId,
      orders: sql<string>`count(*)`,
      sales: sql<string>`coalesce(sum(${s.orders.total}), 0)`,
      lastOrderAt: sql<string>`max(${s.orders.createdAt})::text`,
    })
    .from(s.orders)
    .where(and(eq(s.orders.channel, "agent"), gte(s.orders.createdAt, today)))
    .groupBy(s.orders.agentId);

  const unitAgg = await db
    .select({
      agentId: s.orders.agentId,
      units: sql<string>`coalesce(sum(${s.orderItems.qty}), 0)`,
    })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orders.channel, "agent"), gte(s.orders.createdAt, today)))
    .groupBy(s.orders.agentId);

  const agents = await db.select().from(s.agents).orderBy(desc(s.agents.fact));
  const orderMap = new Map(orderAgg.map((r) => [r.agentId, r]));
  const unitMap = new Map(unitAgg.map((r) => [r.agentId, r]));

  const byAgent = agents.map((agent) => {
    const ord = orderMap.get(agent.id);
    const units = unitMap.get(agent.id);
    return {
      id: agent.id,
      name: agent.name,
      region: agent.region,
      route: agent.route,
      orders: Number(ord?.orders ?? 0),
      sales: Number(ord?.sales ?? 0),
      units: Number(units?.units ?? 0),
      lastOrderAt: ord?.lastOrderAt ?? null,
    };
  });

  const topProducts = await db
    .select({
      productId: s.products.id,
      name: s.products.name,
      units: sql<string>`coalesce(sum(${s.orderItems.qty}), 0)`,
      revenue: sql<string>`coalesce(sum(${s.orderItems.qty} * ${s.orderItems.price}), 0)`,
    })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .where(and(eq(s.orders.channel, "agent"), gte(s.orders.createdAt, today)))
    .groupBy(s.products.id, s.products.name)
    .orderBy(desc(sql`sum(${s.orderItems.qty})`))
    .limit(8);

  const recentOrders = await db
    .select({
      id: s.orders.id,
      number: s.orders.number,
      total: s.orders.total,
      createdAt: s.orders.createdAt,
      agentId: s.orders.agentId,
      agentName: sql<string>`coalesce(a.name, 'Агент')`,
    })
    .from(s.orders)
    .leftJoin(sql`agents a`, sql`a.id = ${s.orders.agentId}`)
    .where(eq(s.orders.channel, "agent"))
    .orderBy(desc(s.orders.createdAt))
    .limit(10);

  return {
    totals: {
      todayOrders: byAgent.reduce((sum, a) => sum + a.orders, 0),
      todaySales: byAgent.reduce((sum, a) => sum + a.sales, 0),
      todayUnits: byAgent.reduce((sum, a) => sum + a.units, 0),
      activeAgents: byAgent.filter((a) => a.orders > 0).length,
    },
    byAgent,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: p.name,
      units: Number(p.units),
      revenue: Number(p.revenue),
    })),
    recentOrders: recentOrders.map((o) => ({
      ...o,
      total: Number(o.total),
      createdAt: String(o.createdAt),
    })),
  };
}

export type AgentControlSummary = Awaited<ReturnType<typeof getAgentControlSummary>>;
