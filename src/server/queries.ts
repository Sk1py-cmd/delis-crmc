import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed, syncNumberSequences } from "@/db/seed";
import { desc, eq, sql, and, gte } from "drizzle-orm";
import { canAccess } from "@/shared/config/nav";
import { statusMeta } from "@/shared/lib/format";
import { sendPushToAll } from "@/server/webpush";


/** Ошибка бизнес-правила: наверх уходит как 400, а не 500. */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

/**
 * Номера заказов, закупок и SKU выдаются последовательностями Postgres.
 *
 * Раньше использовалось `префикс + count(*)`: два параллельных запроса
 * успевали прочитать одинаковый count и создавали записи с одним номером
 * (воспроизводилось на пяти одновременных заказах). nextval атомарен.
 */
async function nextNumber(seq: string, prefix: string): Promise<string> {
  const res = await db.execute<{ v: string }>(sql`select nextval(${seq})::bigint as v`);
  const rows = (Array.isArray(res) ? res : res.rows) as { v: string }[];
  return `${prefix}${rows[0].v}`;
}

export const nextOrderNumber = () => nextNumber("order_number_seq", "DLS-");
export const nextPurchaseOrderNumber = () => nextNumber("purchase_order_number_seq", "PO-");
export const nextSku = () => nextNumber("product_sku_seq", "DLS-");


export type Product = typeof s.products.$inferSelect;
export type Order = typeof s.orders.$inferSelect;
export type Customer = typeof s.customers.$inferSelect;
export type Agent = typeof s.agents.$inferSelect;
export type Message = typeof s.messages.$inferSelect;

export async function init() {
  await ensureSeed();
}

export async function getCompanyOS() {
  await init();
  const [counts] = await db
    .select({
      products: sql<string>`(select count(*) from products)`,
      orders: sql<string>`(select count(*) from orders)`,
      customers: sql<string>`(select count(*) from customers)`,
      agents: sql<string>`(select count(*) from agents)`,
      unread: sql<string>`(select count(*) from messages where from_admin = false and read_at is null)`,
      lowStock: sql<string>`(select count(*) from products where stock < low_stock)`,
      openOrders: sql<string>`(select count(*) from orders where status not in ('delivered','cancelled','returned'))`,
      todayRevenue: sql<string>`(select coalesce(sum(total),0) from orders where created_at >= current_date)`,
    })
    .from(sql`(select 1) t`);

  const sync = await db.select().from(s.syncEvents).orderBy(desc(s.syncEvents.createdAt)).limit(12);
  const modules = [
    { key: "crm", label: "CRM", status: "online", latency: 18, color: "#8b5cf6", items: Number(counts.orders) + Number(counts.customers) },
    { key: "telegram_bot", label: "Telegram Bot", status: "online", latency: 42, color: "#0ea5e9", items: Number(counts.unread) },
    { key: "miniapp", label: "Telegram Mini App", status: "online", latency: 36, color: "#3b82f6", items: Number(counts.products) },
    { key: "website", label: "Официальный сайт", status: "online", latency: 54, color: "#22c55e", items: Number(counts.products) },
    { key: "warehouse", label: "Склад", status: Number(counts.lowStock) > 0 ? "attention" : "online", latency: 24, color: "#f97316", items: Number(counts.lowStock) },
    { key: "finance", label: "Финансы", status: "online", latency: 29, color: "#14b8a6", items: Number(counts.todayRevenue) },
    { key: "agents", label: "Агенты продаж", status: "online", latency: 63, color: "#ec4899", items: Number(counts.agents) },
    { key: "marketing", label: "Маркетинг", status: "online", latency: 48, color: "#a855f7", items: 6 },
  ];
  return { counts, sync, modules };
}

export async function recordSyncEvent(input: {
  source?: string;
  target?: string;
  entity: string;
  action: string;
  status?: string;
  payload?: Record<string, string | number | boolean>;
}) {
  const [event] = await db
    .insert(s.syncEvents)
    .values({
      source: input.source ?? "crm",
      target: input.target ?? "all",
      entity: input.entity,
      action: input.action,
      status: input.status ?? "synced",
      payload: input.payload ?? {},
    })
    .returning();
  return event;
}

export async function syncEverything(actor: string) {
  await recordSyncEvent({
    source: "crm",
    target: "all",
    entity: "company_os",
    action: "manual_full_sync",
    payload: { actor, modules: 8 },
  });
  await db.insert(s.activity).values({ actor, action: "запустил полную синхронизацию Company OS", entity: "CRM · Bot · Mini App · Site · Warehouse · Finance" });
}

export async function getDashboard() {
  await init();
  const [totals] = await db
    .select({
      revenue: sql<string>`coalesce(sum(total),0)`,
      profit: sql<string>`coalesce(sum(profit),0)`,
      orders: sql<string>`count(*)`,
      avg: sql<string>`coalesce(avg(total),0)`,
      cancelled: sql<string>`count(*) filter (where status = 'cancelled')`,
      delivered: sql<string>`count(*) filter (where status = 'delivered')`,
      returned: sql<string>`count(*) filter (where status = 'returned')`,
    })
    .from(s.orders);

  const [counts] = await db
    .select({
      products: sql<string>`(select count(*) from products)`,
      customers: sql<string>`(select count(*) from customers)`,
      agents: sql<string>`(select count(*) from agents)`,
      stock: sql<string>`(select coalesce(sum(stock),0) from products)`,
      expenses: sql<string>`(select coalesce(sum(amount),0) from transactions where kind = 'expense')`,
      lowStock: sql<string>`(select count(*) from products where stock < low_stock)`,
    })
    .from(sql`(select 1) t`);

  // Окна для честных дельт «за 30 дней»: текущие/прошлые расходы за месяц
  // и число клиентов, существовавших 30 дней назад (для роста базы).
  const [window] = await db
    .select({
      curExpenses: sql<string>`(select coalesce(sum(amount),0) from transactions where kind = 'expense' and created_at >= now() - interval '30 days')`,
      prevExpenses: sql<string>`(select coalesce(sum(amount),0) from transactions where kind = 'expense' and created_at >= now() - interval '60 days' and created_at < now() - interval '30 days')`,
      customers30dAgo: sql<string>`(select count(*) from customers where created_at < now() - interval '30 days')`,
    })
    .from(sql`(select 1) t`);

  const [prevOrders] = await db
    .select({
      revenue: sql<string>`coalesce(sum(total),0)`,
      profit: sql<string>`coalesce(sum(profit),0)`,
      orders: sql<string>`count(*)`,
    })
    .from(s.orders)
    .where(sql`created_at >= now() - interval '60 days' and created_at < now() - interval '30 days'`);

  const [todayVs] = await db
    .select({
      todayOrders: sql<string>`count(*) filter (where created_at >= current_date)`,
      todayRevenue: sql<string>`coalesce(sum(total) filter (where created_at >= current_date),0)`,
      yesterdayOrders: sql<string>`count(*) filter (where created_at >= current_date - interval '1 day' and created_at < current_date)`,
      yesterdayRevenue: sql<string>`coalesce(sum(total) filter (where created_at >= current_date - interval '1 day' and created_at < current_date),0)`,
      todayAvg: sql<string>`coalesce(sum(total) filter (where created_at >= current_date),0) / nullif(count(*) filter (where created_at >= current_date),0)`,
      yesterdayAvg: sql<string>`coalesce(sum(total) filter (where created_at >= current_date - interval '1 day' and created_at < current_date),0) / nullif(count(*) filter (where created_at >= current_date - interval '1 day' and created_at < current_date),0)`,
      todayCancelled: sql<string>`count(*) filter (where created_at >= current_date and status = 'cancelled')`,
      yesterdayCancelled: sql<string>`count(*) filter (where created_at >= current_date - interval '1 day' and created_at < current_date and status = 'cancelled')`,
    })
    .from(s.orders);

  const byDay = await db
    .select({
      day: sql<string>`to_char(created_at, 'DD.MM')`,
      revenue: sql<string>`sum(total)`,
      profit: sql<string>`sum(profit)`,
      orders: sql<string>`count(*)`,
    })
    .from(s.orders)
    .where(gte(s.orders.createdAt, sql`now() - interval '30 days'`))
    .groupBy(sql`1, date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  const byChannel = await db
    .select({ name: s.orders.channel, value: sql<string>`sum(total)` })
    .from(s.orders)
    .groupBy(s.orders.channel);

  const byStatus = await db
    .select({ name: s.orders.status, value: sql<string>`count(*)` })
    .from(s.orders)
    .groupBy(s.orders.status);

  const topProducts = await db
    .select()
    .from(s.products)
    .orderBy(desc(s.products.sold))
    .limit(6);

  const lowStock = await db
    .select()
    .from(s.products)
    .where(sql`stock < low_stock * 2`)
    .orderBy(s.products.stock)
    .limit(6);

  const recentOrders = await recentOrdersList(7);
  const recentCustomers = await db.select().from(s.customers).orderBy(desc(s.customers.createdAt)).limit(5);
  const recentMessages = await db
    .select({
      id: s.messages.id,
      body: s.messages.body,
      createdAt: s.messages.createdAt,
      fromAdmin: s.messages.fromAdmin,
      customer: sql<string>`c.first_name || ' ' || c.last_name`,
    })
    .from(s.messages)
    .innerJoin(sql`customers c`, sql`c.id = ${s.messages.customerId}`)
    .orderBy(desc(s.messages.createdAt))
    .limit(5);
  const acts = await db.select().from(s.activity).orderBy(desc(s.activity.createdAt)).limit(6);
  const agents = await db.select().from(s.agents).orderBy(desc(s.agents.fact)).limit(5);

  // Дельты «за 30 дней» считаются по реальным окнам, а не константам из вёрстки.
  const last30 = byDay.reduce(
    (a, r) => ({
      revenue: a.revenue + Number(r.revenue || 0),
      profit: a.profit + Number(r.profit || 0),
      orders: a.orders + Number(r.orders || 0),
    }),
    { revenue: 0, profit: 0, orders: 0 },
  );
  const prev30 = {
    revenue: Number(prevOrders.revenue),
    profit: Number(prevOrders.profit),
    orders: Number(prevOrders.orders),
    expenses: Number(window.prevExpenses),
  };
  const expenses30 = Number(window.curExpenses);
  const customers30dAgo = Number(window.customers30dAgo);

  return { totals, counts, todayVs, byDay, byChannel, byStatus, topProducts, lowStock, recentOrders, recentCustomers, recentMessages, acts, agents, last30, prev30, expenses30, customers30dAgo };
}

export async function recentOrdersList(limit = 100) {
  return db
    .select({
      id: s.orders.id,
      number: s.orders.number,
      status: s.orders.status,
      total: s.orders.total,
      profit: s.orders.profit,
      channel: s.orders.channel,
      payment: s.orders.payment,
      createdAt: s.orders.createdAt,
      customerId: s.orders.customerId,
      customer: sql<string>`c.first_name || ' ' || c.last_name`,
      city: sql<string>`c.city`,
      agent: sql<string>`coalesce(a.name, '—')`,
    })
    .from(s.orders)
    .leftJoin(sql`customers c`, sql`c.id = ${s.orders.customerId}`)
    .leftJoin(sql`agents a`, sql`a.id = ${s.orders.agentId}`)
    .orderBy(desc(s.orders.createdAt))
    .limit(limit);
}

export type OrderRow = Awaited<ReturnType<typeof recentOrdersList>>[number];

export async function getOrdersLite() {
  await init();
  return recentOrdersList(12);
}

export async function getOrder(id: number) {
  await init();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!order) return null;
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id));
  const customer = order.customerId
    ? (await db.select().from(s.customers).where(eq(s.customers.id, order.customerId)))[0]
    : undefined;
  return { order, items, customer };
}

export async function getCustomerOrders(customerId: number) {
  await init();
  return db
    .select()
    .from(s.orders)
    .where(eq(s.orders.customerId, customerId))
    .orderBy(s.orders.createdAt);
}

export async function getProduct(id: number) {
  await init();
  const rows = await db
    .select({
      id: s.products.id,
      name: s.products.name,
      slug: s.products.slug,
      sku: s.products.sku,
      barcode: s.products.barcode,
      description: s.products.description,
      brand: s.products.brand,
      country: s.products.country,
      volume: s.products.volume,
      weight: s.products.weight,
      price: s.products.price,
      cost: s.products.cost,
      vat: s.products.vat,
      discount: s.products.discount,
      stock: s.products.stock,
      lowStock: s.products.lowStock,
      image: s.products.image,
      images: s.products.images,
      color: s.products.color,
      isPopular: s.products.isPopular,
      isNew: s.products.isNew,
      isFeatured: s.products.isFeatured,
      status: s.products.status,
      sold: s.products.sold,
      categoryId: s.products.categoryId,
      category: sql<string>`coalesce(cat.name, 'Без категории')`,
    })
    .from(s.products)
    .leftJoin(sql`categories cat`, sql`cat.id = ${s.products.categoryId}`)
    .where(eq(s.products.id, id))
    .limit(1);

  const product = rows[0];
  if (!product) return null;

  const recentOrders = await db
    .select({
      id: s.orders.id,
      number: s.orders.number,
      status: s.orders.status,
      total: s.orders.total,
      qty: s.orderItems.qty,
      createdAt: s.orders.createdAt,
      customer: sql<string>`c.first_name || ' ' || c.last_name`,
    })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .leftJoin(sql`customers c`, sql`c.id = ${s.orders.customerId}`)
    .where(eq(s.orderItems.productId, id))
    .orderBy(desc(s.orders.createdAt))
    .limit(10);

  return { product, category: product.category, recentOrders };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

export async function getProducts() {
  await init();
  return db
    .select({
      id: s.products.id,
      name: s.products.name,
      sku: s.products.sku,
      barcode: s.products.barcode,
      price: s.products.price,
      cost: s.products.cost,
      stock: s.products.stock,
      lowStock: s.products.lowStock,
      image: s.products.image,
      images: s.products.images,
      volume: s.products.volume,
      status: s.products.status,
      sold: s.products.sold,
      isNew: s.products.isNew,
      isPopular: s.products.isPopular,
      isFeatured: s.products.isFeatured,
      brand: s.products.brand,
      description: s.products.description,
      category: sql<string>`coalesce(cat.name, 'Без категории')`,
      categoryId: s.products.categoryId,
    })
    .from(s.products)
    .leftJoin(sql`categories cat`, sql`cat.id = ${s.products.categoryId}`)
    .orderBy(desc(s.products.sold));
}

export type ProductRow = Awaited<ReturnType<typeof getProducts>>[number];

export async function getCustomers() {
  await init();
  return db.select().from(s.customers).orderBy(desc(s.customers.totalSpent));
}

export async function getCustomer(id: number) {
  await init();
  const [customer] = await db.select().from(s.customers).where(eq(s.customers.id, id));
  if (!customer) return null;
  const orders = await db.select().from(s.orders).where(eq(s.orders.customerId, id)).orderBy(desc(s.orders.createdAt));
  const msgs = await db.select().from(s.messages).where(eq(s.messages.customerId, id)).orderBy(s.messages.createdAt);
  return { customer, orders, msgs };
}

export async function getAgents() {
  await init();
  return db.select().from(s.agents).orderBy(desc(s.agents.fact));
}

export async function getTasks() {
  await init();
  return db.select().from(s.tasks).orderBy(desc(s.tasks.createdAt)).limit(100);
}

export async function createTask(input: {
  title: string; description: string; assignee: string; priority: string;
  linkType: string; linkLabel: string; dueAt: Date | null; actor: string;
}) {
  const [t] = await db.insert(s.tasks).values({
    title: input.title, description: input.description, assignee: input.assignee,
    priority: input.priority, linkType: input.linkType, linkLabel: input.linkLabel,
    dueAt: input.dueAt, createdBy: input.actor,
  }).returning();
  await db.insert(s.activity).values({ actor: input.actor, action: "создал задачу", entity: input.title });
  await recordSyncEvent({ source: "crm", target: "all", entity: "task", action: "task_created", payload: { title: input.title, assignee: input.assignee } });
  return t;
}

/** Колонки канбана в интерфейсе задач. */
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export async function updateTaskStatus(id: number, status: string, actor: string) {
  // Статус приходит из запроса: произвольное значение записывалось в БД,
  // и задача пропадала из интерфейса — она не попадала ни в одну колонку.
  if (!TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
    throw new BusinessError(`Недопустимый статус задачи: ${status}`);
  }

  const [t] = await db.update(s.tasks).set({ status }).where(eq(s.tasks.id, id)).returning();
  if (!t) throw new BusinessError("Задача не найдена");
  if (t && status === "done") {
    await db.insert(s.activity).values({ actor, action: "выполнил задачу", entity: t.title });
  }
  return t;
}

export async function deleteTask(id: number) {
  await db.delete(s.tasks).where(eq(s.tasks.id, id));
  return { ok: true };
}

export async function getAgentVisits(agentId?: number) {
  await init();
  return db
    .select({
      id: s.agentVisits.id,
      agentId: s.agentVisits.agentId,
      storeName: s.agentVisits.storeName,
      storeAddress: s.agentVisits.storeAddress,
      gpsCoords: s.agentVisits.gpsCoords,
      status: s.agentVisits.status,
      orderTotal: s.agentVisits.orderTotal,
      notes: s.agentVisits.notes,
      photos: s.agentVisits.photos,
      visitedAt: s.agentVisits.visitedAt,
      agentName: sql<string>`a.name`,
    })
    .from(s.agentVisits)
    .leftJoin(sql`agents a`, sql`a.id = ${s.agentVisits.agentId}`)
    .where(agentId ? eq(s.agentVisits.agentId, agentId) : sql`1=1`)
    .orderBy(desc(s.agentVisits.visitedAt))
    .limit(50);
}

export async function addAgentVisit(input: {
  agentId: number;
  storeName: string;
  storeAddress: string;
  gpsCoords: string;
  status: string;
  orderTotal: number;
  notes: string;
  photos: string[];
  actor: string;
}) {
  const [v] = await db
    .insert(s.agentVisits)
    .values({
      agentId: input.agentId,
      storeName: input.storeName.trim() || "Торговая точка B2B",
      storeAddress: input.storeAddress,
      gpsCoords: input.gpsCoords || "41.2858, 69.2035",
      status: input.status || "order_placed",
      orderTotal: String(input.orderTotal || 0),
      notes: input.notes,
      photos: input.photos || [],
      visitedAt: new Date(),
    })
    .returning();

  await db
    .update(s.agents)
    .set({
      visits: sql`visits + 1`,
      fact: input.orderTotal > 0 ? sql`fact + ${input.orderTotal}` : sql`fact`,
    })
    .where(eq(s.agents.id, input.agentId));

  await db.insert(s.activity).values({
    actor: input.actor,
    action: "добавил фотоотчёт и визит торговой точки",
    entity: `${input.storeName} (${input.orderTotal > 0 ? `заказ на ${input.orderTotal} сум` : "без заказа"})`,
  });

  await recordSyncEvent({
    source: "crm",
    target: "all",
    entity: "agent_visit",
    action: "visit_recorded",
    payload: { agentId: input.agentId, storeName: input.storeName, orderTotal: input.orderTotal },
  });

  return v;
}

export async function createAgentStoreOrder(input: {
  agentId: number;
  storeName: string;
  storeAddress: string;
  items: { productId: number; qty: number }[];
  notes: string;
  actor: string;
}) {
  const ids = input.items.map((i) => i.productId).filter(Boolean);
  if (ids.length === 0) throw new Error("Добавьте хотя бы одну позицию");

  const prods = await db
    .select()
    .from(s.products)
    .where(sql`${s.products.id} = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`);
  const map = new Map(prods.map((p) => [p.id, p]));

  let total = 0;
  let costTotal = 0;
  const rows: { productId: number; name: string; qty: number; price: string }[] = [];
  for (const it of input.items) {
    const p = map.get(it.productId);
    if (!p) continue;
    const qty = Math.max(1, it.qty);
    total += Number(p.price) * qty;
    costTotal += Number(p.cost) * qty;
    rows.push({ productId: p.id, name: p.name, qty, price: p.price });
  }

  const orderNumber = await nextOrderNumber();

  const [order] = await db
    .insert(s.orders)
    .values({
      number: orderNumber,
      agentId: input.agentId,
      status: "confirmed",
      channel: "agent",
      payment: "bank",
      total: String(total),
      profit: String(total - costTotal),
      comment: `B2B Торговая точка: ${input.storeName} (${input.storeAddress})`,
      timeline: [{ status: "confirmed", at: new Date().toISOString(), by: input.actor }],
    })
    .returning();

  if (rows.length > 0) {
    await db.insert(s.orderItems).values(rows.map((r) => ({ ...r, orderId: order.id })));
  }

  for (const it of input.items) {
    await adjustStock(it.productId, "out", Math.max(1, it.qty), `B2B заказ агента ${orderNumber}`);
  }

  await db
    .insert(s.agentVisits)
    .values({
      agentId: input.agentId,
      storeName: input.storeName.trim() || "Торговая точка B2B",
      storeAddress: input.storeAddress,
      gpsCoords: "41.2858, 69.2035",
      status: "order_placed",
      orderTotal: String(total),
      notes: input.notes || `Оформлен заказ ${orderNumber} на сумму ${total} сум`,
      photos: [],
      visitedAt: new Date(),
    });

  await db
    .update(s.agents)
    .set({
      visits: sql`visits + 1`,
      fact: sql`fact + ${total}`,
    })
    .where(eq(s.agents.id, input.agentId));

  await db.insert(s.activity).values({
    actor: input.actor,
    action: `оформил заказ от торговой точки «${input.storeName}»`,
    entity: `${orderNumber} на сумму ${total} сум`,
  });

  await recordSyncEvent({
    source: "crm",
    target: "all",
    entity: "agent_order",
    action: "agent_order_created",
    payload: { agentId: input.agentId, orderNumber, total },
  });

  return order;
}

export async function getWarehouse() {
  await init();
  const products = await getProducts();
  const moves = await db
    .select({
      id: s.stockMoves.id,
      kind: s.stockMoves.kind,
      qty: s.stockMoves.qty,
      note: s.stockMoves.note,
      createdAt: s.stockMoves.createdAt,
      product: sql<string>`p.name`,
    })
    .from(s.stockMoves)
    .innerJoin(sql`products p`, sql`p.id = ${s.stockMoves.productId}`)
    .orderBy(desc(s.stockMoves.createdAt))
    .limit(40);
  return { products, moves };
}

export async function getFinance() {
  await init();
  const tx = await db.select().from(s.transactions).orderBy(desc(s.transactions.createdAt)).limit(60);
  const [agg] = await db
    .select({
      income: sql<string>`coalesce(sum(amount) filter (where kind='income'),0)`,
      expense: sql<string>`coalesce(sum(amount) filter (where kind='expense'),0)`,
    })
    .from(s.transactions);
  const byAccount = await db
    .select({ name: s.transactions.account, value: sql<string>`sum(amount)` })
    .from(s.transactions)
    .where(eq(s.transactions.kind, "income"))
    .groupBy(s.transactions.account);
  const byCategory = await db
    .select({ name: s.transactions.category, value: sql<string>`sum(amount)` })
    .from(s.transactions)
    .where(eq(s.transactions.kind, "expense"))
    .groupBy(s.transactions.category);
  const byDay = await db
    .select({
      day: sql<string>`to_char(created_at,'DD.MM')`,
      income: sql<string>`coalesce(sum(amount) filter (where kind='income'),0)`,
      expense: sql<string>`coalesce(sum(amount) filter (where kind='expense'),0)`,
    })
    .from(s.transactions)
    .groupBy(sql`1, date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);
  return { tx, agg, byAccount, byCategory, byDay };
}

export async function getAnalytics() {
  await init();
  const dash = await getDashboard();
  const byCity = await db
    .select({ name: s.customers.city, value: sql<string>`coalesce(sum(o.total),0)` })
    .from(s.customers)
    .leftJoin(sql`orders o`, sql`o.customer_id = ${s.customers.id}`)
    .groupBy(s.customers.city);
  const bySource = await db
    .select({ name: s.customers.source, value: sql<string>`count(*)` })
    .from(s.customers)
    .groupBy(s.customers.source);
  // Лояльность и маркетинг для KPI аналитики: считаем по фактам, а не по
  // константам вёрстки. Покупатели и повторные покупки берутся из заказов —
  // денормализованные счётчики customers.* обновляются только при сиде.
  const [loyalty] = await db
    .select({
      buyers: sql<string>`(select count(distinct customer_id) from orders where customer_id is not null)`,
      repeat: sql<string>`(select count(*) from (select customer_id from orders where customer_id is not null group by customer_id having count(*) >= 2) r)`,
      marketing: sql<string>`(select coalesce(sum(amount),0) from transactions where kind = 'expense' and category = 'marketing')`,
    })
    .from(sql`(select 1) t`);
  const topCustomers = await db.select().from(s.customers).orderBy(desc(s.customers.totalSpent)).limit(6);
  return { ...dash, loyalty, byCity, bySource, topCustomers };
}

export async function getChatThreads() {
  await init();
  return db
    .select({
      id: s.customers.id,
      name: sql<string>`${s.customers.firstName} || ' ' || ${s.customers.lastName}`,
      username: s.customers.username,
      city: s.customers.city,
      isVip: s.customers.isVip,
      source: s.customers.source,
      last: sql<string>`(select body from messages m where m.customer_id = ${s.customers.id} order by created_at desc limit 1)`,
      lastAt: sql<string>`(select created_at from messages m where m.customer_id = ${s.customers.id} order by created_at desc limit 1)`,
      unread: sql<string>`(select count(*) from messages m where m.customer_id = ${s.customers.id} and m.from_admin = false and m.read_at is null)`,
    })
    .from(s.customers)
    .orderBy(desc(sql`(select created_at from messages m where m.customer_id = ${s.customers.id} order by created_at desc limit 1)`));
}

export type ChatThread = Awaited<ReturnType<typeof getChatThreads>>[number];

export async function getMessages(customerId: number) {
  await init();
  return db.select().from(s.messages).where(eq(s.messages.customerId, customerId)).orderBy(s.messages.createdAt);
}

export async function getTemplates() {
  await init();
  return db.select().from(s.templates);
}

export async function getBroadcastData() {
  await init();
  const customers = await db
    .select({
      id: s.customers.id,
      firstName: s.customers.firstName,
      lastName: s.customers.lastName,
      username: s.customers.username,
      city: s.customers.city,
      source: s.customers.source,
      isVip: s.customers.isVip,
      bonus: s.customers.bonus,
      ordersCount: s.customers.ordersCount,
      totalSpent: s.customers.totalSpent,
      lastActiveAt: s.customers.lastActiveAt,
    })
    .from(s.customers);
  const templates = await getTemplates();
  const history = await db
    .select()
    .from(s.broadcasts)
    .orderBy(desc(s.broadcasts.sentAt))
    .limit(8);
  return { customers, templates, history };
}

export type BroadcastCustomer = Awaited<ReturnType<typeof getBroadcastData>>["customers"][number];

export async function recordBroadcast(data: {
  title: string;
  body: string;
  recipients: number;
  channel: string;
  status?: string;
  scheduledAt?: Date | null;
  createdBy?: string;
}) {
  const [b] = await db
    .insert(s.broadcasts)
    .values({
      title: data.title,
      body: data.body,
      recipients: data.recipients,
      channel: data.channel,
      status: data.status ?? "sent",
      scheduledAt: data.scheduledAt ?? null,
      createdBy: data.createdBy ?? "",
      sentAt: new Date(),
    })
    .returning();
  await recordSyncEvent({
    source: "crm",
    target: data.channel === "all" ? "telegram_bot" : data.channel,
    entity: "broadcast",
    action: "broadcast_sent",
    payload: { title: data.title, recipients: data.recipients },
  });
  return b;
}

export async function getUsers() {
  await init();
  return db.select().from(s.users);
}

export async function getActivity() {
  await init();
  return db.select().from(s.activity).orderBy(desc(s.activity.createdAt)).limit(30);
}

export async function getContent(surface: string) {
  await init();
  return db.select().from(s.contentBlocks).where(eq(s.contentBlocks.surface, surface));
}

/**
 * Глобальный поиск.
 *
 * Результаты фильтруются по правам роли: раньше выдача была одинаковой
 * для всех, и кладовщик через строку поиска видел клиентов с телефонами
 * и суммы заказов, хотя оба раздела ему закрыты. Ссылки в выдаче вели
 * на страницы, куда роль всё равно не пускают, — то есть поиск работал
 * обходным каналом к тем же данным.
 *
 * `role` необязателен: без него (внутренние вызовы) выдача полная.
 */
export async function search(q: string, role?: string) {
  await init();
  const like = `%${q}%`;
  const allowed = (section: string) => !role || canAccess(role, section);

  const [prods, ords, custs, ags] = await Promise.all([
    allowed("/products")
      ? db.select().from(s.products).where(sql`name ilike ${like} or sku ilike ${like} or barcode ilike ${like}`).limit(5)
      : [],
    allowed("/orders")
      ? db
          .select()
          .from(s.orders)
          .where(sql`number ilike ${like} or status ilike ${like}`)
          .limit(5)
      : [],
    allowed("/customers")
      ? db
          .select()
          .from(s.customers)
          .where(sql`first_name ilike ${like} or last_name ilike ${like} or username ilike ${like} or phone ilike ${like}`)
          .limit(5)
      : [],
    allowed("/agents")
      ? db.select().from(s.agents).where(sql`name ilike ${like} or region ilike ${like}`).limit(4)
      : [],
  ]);
  return [
    ...prods.map((p) => ({ type: "Товар", title: p.name, subtitle: `${p.sku} · остаток ${p.stock}`, href: `/products?id=${p.id}` })),
    ...ords.map((o) => ({ type: "Заказ", title: o.number, subtitle: `${o.status} · ${o.total} сум`, href: `/orders/${o.id}` })),
    ...custs.map((c) => ({
      type: "Клиент",
      title: `${c.firstName} ${c.lastName}`,
      subtitle: `@${c.username} · ${c.phone}`,
      href: `/customers/${c.id}`,
    })),
    ...ags.map((a) => ({ type: "Агент", title: a.name, subtitle: a.region, href: `/agents` })),
  ];
}

export async function setOrderStatus(id: number, status: string, by = "Музаффар") {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!order) return null;
  const timeline = [...order.timeline, { status, at: new Date().toISOString(), by }];
  const [updated] = await db.update(s.orders).set({ status, timeline }).where(eq(s.orders.id, id)).returning();
  await db.insert(s.activity).values({ actor: by, action: `изменил статус на «${status}»`, entity: order.number });
  await recordSyncEvent({ source: "crm", target: "telegram_bot", entity: "order", action: "order_status_changed", payload: { order: order.number, status } });
  await recordSyncEvent({ source: "crm", target: "miniapp", entity: "order", action: "customer_order_updated", payload: { order: order.number, status } });
  // Реальная доставка статуса клиенту в Telegram, а не только sync-событие:
  // если у клиента есть telegram_id и бот подключён, шлём ему сообщение.
  await notifyCustomerStatusChanged(order.number, order.customerId, status);
  return updated;
}

/**
 * Отправляет клиенту в Telegram сообщение о смене статуса его заказа.
 *
 * Сбой доставки (бот выключен, нет сети, у клиента нет telegram_id) не
 * должен ломать саму смену статуса — поэтому молча проглатываем ошибки.
 */
async function notifyCustomerStatusChanged(orderNumber: string, customerId: number | null, status: string) {
  if (!customerId) return;
  try {
    const [c] = await db
      .select({ telegramId: s.customers.telegramId })
      .from(s.customers)
      .where(eq(s.customers.id, customerId))
      .limit(1);
    if (!c?.telegramId) return;
    const label = statusMeta(status).label;
    await sendTelegramMessage(c.telegramId, `📦 Ваш заказ ${orderNumber}: статус «${label}»`);
  } catch {
    /* Смена статуса важнее, чем уведомление */
  }
}

export async function addMessage(customerId: number, body: string, fromAdmin = true, kind = "text") {
  const [m] = await db.insert(s.messages).values({ customerId, body, fromAdmin, kind }).returning();
  await recordSyncEvent({ source: fromAdmin ? "crm" : "telegram_bot", target: fromAdmin ? "telegram_bot" : "crm", entity: "message", action: fromAdmin ? "message_sent" : "message_received", payload: { customerId, kind } });
  return m;
}

export async function upsertProduct(data: Partial<Product> & { id?: number }) {
  const { id, ...rest } = data;
  if (id) {
    const [p] = await db.update(s.products).set(rest).where(eq(s.products.id, id)).returning();
    await recordSyncEvent({ source: "crm", target: "site", entity: "product", action: "product_updated", payload: { productId: id, sku: p.sku } });
    await recordSyncEvent({ source: "crm", target: "miniapp", entity: "product", action: "catalog_updated", payload: { productId: id, sku: p.sku } });
    return p;
  }
  const [p] = await db
    .insert(s.products)
    .values({
      name: rest.name ?? "Новый товар",
      slug: (rest.name ?? "new-product").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      sku: rest.sku ?? await nextSku(),
      ...rest,
    })
    .returning();
  await recordSyncEvent({ source: "crm", target: "site", entity: "product", action: "product_created", payload: { productId: p.id, sku: p.sku } });
  await recordSyncEvent({ source: "crm", target: "miniapp", entity: "product", action: "catalog_updated", payload: { productId: p.id, sku: p.sku } });
  return p;
}

export async function deleteProduct(id: number) {
  await db.delete(s.products).where(eq(s.products.id, id));
}

export async function adjustStock(productId: number, kind: string, qty: number, note: string) {
  const delta = kind === "in" ? qty : -qty;
  // greatest(0, ...) оставлен намеренно: он защищает от отрицательного
  // остатка при ручных корректировках склада. Но списать больше, чем есть,
  // теперь нельзя — иначе движение склада расходилось бы с остатком.
  if (delta < 0) {
    const [p] = await db.select({ stock: s.products.stock, name: s.products.name })
      .from(s.products).where(eq(s.products.id, productId));
    if (!p) throw new BusinessError("Товар не найден");
    if (p.stock < qty) {
      throw new BusinessError(`Недостаточно товара «${p.name}»: на складе ${p.stock}, запрошено ${qty}`);
    }
  }
  await db
    .update(s.products)
    .set({ stock: sql`greatest(0, stock + ${delta})` })
    .where(eq(s.products.id, productId));
  await db.insert(s.stockMoves).values({ productId, kind, qty, note });
  await recordSyncEvent({ source: "warehouse", target: "crm", entity: "stock", action: "stock_changed", payload: { productId, kind, qty } });
  await recordSyncEvent({ source: "crm", target: "miniapp", entity: "stock", action: "availability_updated", payload: { productId } });
}

export async function createOrderQuick(customerId: number, productId: number, qty: number, payment = "click") {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, productId));
  // Раньше отсутствующий товар падал с TypeError (500), а заказ на объём
  // больше остатка проходил: adjustStock прятал минус через greatest(0,...),
  // из-за чего склад обнулялся, а в выручку попадала невыполнимая сумма.
  if (!p) throw new BusinessError("Товар не найден");
  if (p.stock < qty) {
    throw new BusinessError(`Недостаточно товара «${p.name}»: на складе ${p.stock}, запрошено ${qty}`);
  }
  const total = Number(p.price) * qty;
  const orderNumber = await nextOrderNumber();
  const [order] = await db
    .insert(s.orders)
    .values({
      number: orderNumber,
      customerId,
      status: "new",
      channel: "crm",
      payment,
      total: String(total),
      profit: String(total - Number(p.cost) * qty),
      timeline: [{ status: "new", at: new Date().toISOString(), by: "CRM" }],
    })
    .returning();
  await db.insert(s.orderItems).values({ orderId: order.id, productId, name: p.name, qty, price: p.price });
  await adjustStock(productId, "out", qty, `Заказ ${order.number}`);
  await recordSyncEvent({ source: "crm", target: "telegram_bot", entity: "order", action: "order_created", payload: { order: order.number, customerId } });
  await recordSyncEvent({ source: "crm", target: "finance", entity: "order", action: "revenue_planned", payload: { order: order.number, total } });

  // Отправляем уведомление владельцу в Telegram
  await notifyOwnerAboutOrder(order.number, String(total), payment, p.name);

  // И браузерный push всем подписавшимся сотрудникам.
  await sendPushToAll({
    title: `Новый заказ ${order.number}`,
    body: `Сумма: ${total} сум · Оплата: ${payment}`,
    url: `/orders/${order.id}`,
  }).catch(() => {});

  return order;
}

export async function createMultiOrder(customerId: number, items: { productId: number; qty: number }[]) {
  const productIds = items.map((it) => it.productId);
  const prods = await db.select().from(s.products).where(sql`${s.products.id} = any(${sql.raw(`ARRAY[${productIds.join(",")}]::int[]`)})`);
  const prodMap = new Map(prods.map((p) => [p.id, p]));

  let total = 0;
  let costTotal = 0;
  const orderItems: { productId: number; name: string; qty: number; price: string }[] = [];

  for (const it of items) {
    const p = prodMap.get(it.productId);
    if (!p) continue;
    const qty = Math.max(1, it.qty);
    if (p.stock < qty) {
      throw new BusinessError(`Недостаточно товара «${p.name}»: на складе ${p.stock}, запрошено ${qty}`);
    }
    total += Number(p.price) * qty;
    costTotal += Number(p.cost) * qty;
    orderItems.push({ productId: p.id, name: p.name, qty, price: p.price });
  }

  const orderNumber = await nextOrderNumber();
  const [order] = await db
    .insert(s.orders)
    .values({
      number: orderNumber,
      customerId,
      status: "new",
      channel: "crm",
      total: String(total),
      profit: String(total - costTotal),
      timeline: [{ status: "new", at: new Date().toISOString(), by: "CRM" }],
    })
    .returning();

  if (orderItems.length > 0) {
    await db.insert(s.orderItems).values(orderItems.map((it) => ({ ...it, orderId: order.id })));
  }

  for (const it of items) {
    await adjustStock(it.productId, "out", Math.max(1, it.qty), `Заказ ${order.number}`);
  }

  await recordSyncEvent({ source: "crm", target: "telegram_bot", entity: "order", action: "order_created", payload: { order: order.number, customerId, items: items.length } });
  await recordSyncEvent({ source: "crm", target: "finance", entity: "order", action: "revenue_planned", payload: { order: order.number, total } });

  await sendPushToAll({
    title: `Новый заказ ${order.number}`,
    body: `Сумма: ${total} сум · Позиций: ${items.length}`,
    url: `/orders/${order.id}`,
  }).catch(() => {});

  return order;
}

export async function markThreadRead(customerId: number) {
  await db
    .update(s.messages)
    .set({ readAt: new Date() })
    .where(and(eq(s.messages.customerId, customerId), eq(s.messages.fromAdmin, false)));
}

// ── Returns ──
export async function getReturnsData() {
  await init();
  const rows = await db
    .select({
      id: s.returns.id, orderId: s.returns.orderId, reason: s.returns.reason,
      status: s.returns.status, refundAmount: s.returns.refundAmount,
      restockItems: s.returns.restockItems, notes: s.returns.notes,
      createdBy: s.returns.createdBy, createdAt: s.returns.createdAt,
      orderNumber: sql<string>`o.number`,
      customerName: sql<string>`coalesce(c.first_name || ' ' || c.last_name, '—')`,
    })
    .from(s.returns)
    .leftJoin(sql`orders o`, sql`o.id = ${s.returns.orderId}`)
    .leftJoin(sql`customers c`, sql`c.id = ${s.returns.customerId}`)
    .orderBy(desc(s.returns.createdAt))
    .limit(40);
  return rows;
}

export async function createReturn(input: { orderId: number; reason: string; notes: string; actor: string }) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, input.orderId));
  if (!order) throw new Error("Заказ не найден");
  const [ret] = await db.insert(s.returns).values({
    orderId: input.orderId,
    customerId: order.customerId,
    reason: input.reason,
    refundAmount: order.total,
    notes: input.notes,
    createdBy: input.actor,
  }).returning();
  await db.update(s.orders).set({ status: "returned" }).where(eq(s.orders.id, input.orderId));
  await db.insert(s.activity).values({ actor: input.actor, action: "оформил возврат", entity: order.number });
  await recordSyncEvent({ source: "crm", target: "finance", entity: "return", action: "return_created", payload: { order: order.number } });
  return ret;
}

export async function approveReturn(id: number, restock: boolean, actor: string) {
  const [ret] = await db.select().from(s.returns).where(eq(s.returns.id, id));
  if (!ret) throw new BusinessError("Возврат не найден");
  // Повторное одобрение раньше проходило молча: деньги возвращались клиенту
  // дважды, а товар дважды зачислялся на склад. Статус меняем условно и
  // проверяем, что обновилась именно эта строка — так две одновременные
  // попытки не смогут обе пройти дальше.
  if (ret.status === "refunded") {
    throw new BusinessError("Возврат уже одобрен");
  }

  const updated = await db
    .update(s.returns)
    .set({ status: "refunded", restockItems: restock })
    .where(and(eq(s.returns.id, id), sql`${s.returns.status} <> 'refunded'`))
    .returning({ id: s.returns.id });

  if (updated.length === 0) {
    throw new BusinessError("Возврат уже одобрен");
  }
  if (restock) {
    const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, ret.orderId));
    for (const it of items) {
      await db.update(s.products).set({ stock: sql`stock + ${it.qty}` }).where(eq(s.products.id, it.productId));
      await db.insert(s.stockMoves).values({ productId: it.productId, kind: "in", qty: it.qty, note: `Возврат заказа` });
    }
  }
  await db.insert(s.transactions).values({ kind: "expense", category: "logistics", account: "click", amount: ret.refundAmount, note: `Возврат по заказу #${ret.orderId}` });
  await db.insert(s.activity).values({ actor, action: `одобрил возврат${restock ? " с возвратом на склад" : ""}`, entity: `#${ret.orderId}` });
  return { ok: true };
}

// ── Delivery ──
export async function getDeliveryData() {
  await init();
  const [couriersAll, deliveriesAll] = await Promise.all([
    db.select().from(s.couriers).orderBy(s.couriers.name),
    db.select({
      id: s.deliveries.id, orderId: s.deliveries.orderId, courierId: s.deliveries.courierId,
      status: s.deliveries.status, address: s.deliveries.address, city: s.deliveries.city,
      scheduledAt: s.deliveries.scheduledAt, deliveredAt: s.deliveries.deliveredAt,
      notes: s.deliveries.notes, createdAt: s.deliveries.createdAt,
      orderNumber: sql<string>`o.number`, orderTotal: sql<string>`o.total`,
      customerName: sql<string>`coalesce(c.first_name || ' ' || c.last_name, '—')`,
      courierName: sql<string>`coalesce(cr.name, '—')`,
    })
    .from(s.deliveries)
    .leftJoin(sql`orders o`, sql`o.id = ${s.deliveries.orderId}`)
    .leftJoin(sql`customers c`, sql`c.id = o.customer_id`)
    .leftJoin(sql`couriers cr`, sql`cr.id = ${s.deliveries.courierId}`)
    .orderBy(desc(s.deliveries.createdAt))
    .limit(50),
  ]);
  return { couriers: couriersAll, deliveries: deliveriesAll };
}

export async function addCourier(input: { name: string; phone: string; vehicle: string; zone: string; actor: string }) {
  const colors = ["#3b82f6", "#8b5cf6", "#22c55e", "#f97316", "#ec4899", "#14b8a6"];
  const [c] = await db.insert(s.couriers).values({ ...input, avatarColor: colors[Math.floor(Math.random() * colors.length)] }).returning();
  await db.insert(s.activity).values({ actor: input.actor, action: "добавил курьера", entity: c.name });
  return c;
}

export async function assignDelivery(input: { orderId: number; courierId: number; address: string; city: string; notes: string; actor: string }) {
  // Повторное назначение раньше создавало вторую доставку на тот же заказ
  // и накручивало курьеру счётчик активных: у него числилось две посылки
  // вместо одной.
  const [active] = await db
    .select({ id: s.deliveries.id })
    .from(s.deliveries)
    .where(and(eq(s.deliveries.orderId, input.orderId), sql`${s.deliveries.status} <> 'delivered'`))
    .limit(1);

  if (active) throw new BusinessError("По этому заказу уже назначена доставка");

  const [d] = await db.insert(s.deliveries).values({
    orderId: input.orderId, courierId: input.courierId,
    status: "assigned", address: input.address, city: input.city, notes: input.notes,
    scheduledAt: new Date(Date.now() + 4 * 3600_000),
  }).returning();
  await db.update(s.couriers).set({ status: "busy", activeDeliveries: sql`active_deliveries + 1` }).where(eq(s.couriers.id, input.courierId));
  await db.update(s.orders).set({ status: "courier" }).where(eq(s.orders.id, input.orderId));
  await db.insert(s.activity).values({ actor: input.actor, action: "назначил доставку курьеру", entity: `Заказ #${input.orderId}` });
  await recordSyncEvent({ source: "crm", target: "telegram_bot", entity: "delivery", action: "delivery_assigned", payload: { orderId: input.orderId } });
  return d;
}

export async function completeDelivery(id: number, actor: string) {
  const [d] = await db.select().from(s.deliveries).where(eq(s.deliveries.id, id));
  if (!d) throw new BusinessError("Доставка не найдена");
  if (d.status === "delivered") throw new BusinessError("Эта доставка уже завершена");

  // Условный UPDATE: две одновременные попытки не смогут пройти обе и
  // дважды засчитать курьеру одну посылку.
  const closed = await db
    .update(s.deliveries)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(and(eq(s.deliveries.id, id), sql`${s.deliveries.status} <> 'delivered'`))
    .returning({ id: s.deliveries.id });

  if (closed.length === 0) throw new BusinessError("Эта доставка уже завершена");

  if (d.courierId) {
    // Курьер свободен, только если других незакрытых доставок не осталось:
    // раньше статус безусловно ставился available при висящих посылках.
    const [{ n }] = await db
      .select({ n: sql<string>`count(*)` })
      .from(s.deliveries)
      .where(and(eq(s.deliveries.courierId, d.courierId), sql`${s.deliveries.status} <> 'delivered'`));

    const stillBusy = Number(n) > 0;

    await db.update(s.couriers).set({
      activeDeliveries: sql`greatest(0, active_deliveries - 1)`,
      completedToday: sql`completed_today + 1`,
      status: stillBusy ? "busy" : "available",
    }).where(eq(s.couriers.id, d.courierId));
  }
  await db.update(s.orders).set({ status: "delivered" }).where(eq(s.orders.id, d.orderId));
  await db.insert(s.activity).values({ actor, action: "подтвердил доставку", entity: `Заказ #${d.orderId}` });
  return { ok: true };
}

export async function getProcurementData() {
  await init();
  const [suppliers, orders] = await Promise.all([
    db.select().from(s.suppliers).orderBy(desc(s.suppliers.totalPurchased)),
    db
      .select({
        id: s.purchaseOrders.id,
        number: s.purchaseOrders.number,
        supplierId: s.purchaseOrders.supplierId,
        status: s.purchaseOrders.status,
        total: s.purchaseOrders.total,
        paid: s.purchaseOrders.paid,
        expectedAt: s.purchaseOrders.expectedAt,
        receivedAt: s.purchaseOrders.receivedAt,
        notes: s.purchaseOrders.notes,
        createdAt: s.purchaseOrders.createdAt,
        supplierName: sql<string>`sup.name`,
      })
      .from(s.purchaseOrders)
      .leftJoin(sql`suppliers sup`, sql`sup.id = ${s.purchaseOrders.supplierId}`)
      .orderBy(desc(s.purchaseOrders.createdAt))
      .limit(40),
  ]);

  const lowStock = await db
    .select({
      id: s.products.id,
      name: s.products.name,
      sku: s.products.sku,
      stock: s.products.stock,
      lowStock: s.products.lowStock,
      cost: s.products.cost,
    })
    .from(s.products)
    .where(sql`stock < low_stock`)
    .orderBy(s.products.stock)
    .limit(12);

  return { suppliers, orders, lowStock };
}

export async function createSupplier(input: {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  category: string;
  leadTimeDays: number;
  actor: string;
}) {
  const [sup] = await db
    .insert(s.suppliers)
    .values({
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      city: input.city,
      category: input.category,
      leadTimeDays: input.leadTimeDays,
    })
    .returning();
  await db.insert(s.activity).values({ actor: input.actor, action: "добавил поставщика", entity: sup.name });
  await recordSyncEvent({ source: "crm", target: "warehouse", entity: "supplier", action: "supplier_created", payload: { name: sup.name } });
  return sup;
}

export async function createPurchaseOrder(input: {
  supplierId: number;
  items: { productId: number; qty: number }[];
  notes: string;
  actor: string;
}) {
  const ids = input.items.map((i) => i.productId).filter(Boolean);
  if (ids.length === 0) throw new Error("Добавьте хотя бы одну позицию");

  const prods = await db
    .select()
    .from(s.products)
    .where(sql`${s.products.id} = any(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`);
  const map = new Map(prods.map((p) => [p.id, p]));

  let total = 0;
  const rows: { productId: number; name: string; qty: number; price: string }[] = [];
  for (const it of input.items) {
    const p = map.get(it.productId);
    if (!p) continue;
    const qty = Math.max(1, it.qty);
    total += Number(p.cost) * qty;
    rows.push({ productId: p.id, name: p.name, qty, price: p.cost });
  }

  const [sup] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, input.supplierId));
  const [cnt] = await db.select({ c: sql<string>`count(*)` }).from(s.purchaseOrders);

  const [po] = await db
    .insert(s.purchaseOrders)
    .values({
      number: await nextPurchaseOrderNumber(),
      supplierId: input.supplierId,
      status: "sent",
      total: String(total),
      expectedAt: new Date(Date.now() + (sup?.leadTimeDays ?? 7) * 86400000),
      notes: input.notes,
      createdBy: input.actor,
    })
    .returning();

  if (rows.length > 0) {
    await db.insert(s.purchaseItems).values(rows.map((r) => ({ ...r, purchaseOrderId: po.id })));
  }

  await db.insert(s.activity).values({
    actor: input.actor,
    action: `создал закупку у «${sup?.name ?? "поставщика"}»`,
    entity: `${po.number} · ${rows.length} позиций`,
  });
  await recordSyncEvent({
    source: "crm",
    target: "warehouse",
    entity: "purchase_order",
    action: "purchase_created",
    payload: { number: po.number, total },
  });

  return po;
}

export async function receivePurchaseOrder(id: number, actor: string) {
  const [po] = await db.select().from(s.purchaseOrders).where(eq(s.purchaseOrders.id, id));
  if (!po) throw new BusinessError("Закупка не найдена");
  if (po.status === "received") throw new BusinessError("Эта партия уже принята на склад");

  const items = await db.select().from(s.purchaseItems).where(eq(s.purchaseItems.purchaseOrderId, id));

  for (const it of items) {
    await db
      .update(s.products)
      .set({ stock: sql`stock + ${it.qty}` })
      .where(eq(s.products.id, it.productId));
    await db.insert(s.stockMoves).values({
      productId: it.productId,
      kind: "in",
      qty: it.qty,
      note: `Приход по закупке ${po.number}`,
    });
  }

  await db
    .update(s.purchaseOrders)
    .set({ status: "received", receivedAt: new Date(), paid: po.total })
    .where(eq(s.purchaseOrders.id, id));

  await db
    .update(s.suppliers)
    .set({ totalPurchased: sql`total_purchased + ${po.total}` })
    .where(eq(s.suppliers.id, po.supplierId));

  await db.insert(s.transactions).values({
    kind: "expense",
    category: "production",
    account: "bank",
    amount: po.total,
    note: `Оплата закупки ${po.number}`,
  });

  await db.insert(s.activity).values({
    actor,
    action: `принял партию на склад`,
    entity: `${po.number} · ${items.length} позиций`,
  });
  await recordSyncEvent({
    source: "warehouse",
    target: "crm",
    entity: "purchase_order",
    action: "purchase_received",
    payload: { number: po.number, items: items.length },
  });

  return { ok: true, items: items.length };
}

export async function getMarketingData() {
  await init();
  const [promos, triggers, campaigns] = await Promise.all([
    db.select().from(s.promocodes).orderBy(desc(s.promocodes.createdAt)),
    db.select().from(s.marketingTriggers).orderBy(s.marketingTriggers.id),
    db.select().from(s.campaigns).orderBy(desc(s.campaigns.createdAt)).limit(8),
  ]);

  const [ordersAgg] = await db
    .select({
      totalSales: sql<string>`coalesce(sum(total),0)`,
      ordersCount: sql<string>`count(*)`,
    })
    .from(s.orders);

  // Канали привлечения и расходы
  const adChannels = [
    { name: "Telegram Bot / Ads", spent: 18400000, revenue: 84200000, leads: 1240, orders: 380, roi: 358, color: "#0ea5e9" },
    { name: "Telegram Mini App", spent: 8200000, revenue: 56100000, leads: 910, orders: 290, roi: 584, color: "#8b5cf6" },
    { name: "Instagram Ads / Reels", spent: 24600000, revenue: 78900000, leads: 2180, orders: 310, roi: 221, color: "#ec4899" },
    { name: "Агенты и B2B рекомендации", spent: 12000000, revenue: 95400000, leads: 320, orders: 180, roi: 695, color: "#22c55e" },
    { name: "Официальный сайт SEO/Direct", spent: 4800000, revenue: 32000000, leads: 480, orders: 110, roi: 567, color: "#f59e0b" },
  ];

  return {
    promos,
    triggers,
    campaigns,
    adChannels,
    totalSales: Number(ordersAgg.totalSales),
    ordersCount: Number(ordersAgg.ordersCount),
  };
}

export async function createPromocode(input: {
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number;
  validUntil?: Date | null;
  actor: string;
}) {
  // Значения приходят из формы без ограничений: раньше проходили скидка
  // 500% и отрицательная скидка, попадая в список и в событие для бота.
  const type = input.discountType === "fixed" ? "fixed" : "percent";
  const value = Number(input.discountValue);

  if (!Number.isFinite(value) || value <= 0) {
    throw new BusinessError("Размер скидки должен быть больше нуля");
  }
  if (type === "percent" && value > 100) {
    throw new BusinessError("Скидка в процентах не может превышать 100%");
  }
  if (!Number.isFinite(input.minOrderAmount) || input.minOrderAmount < 0) {
    throw new BusinessError("Минимальная сумма заказа не может быть отрицательной");
  }
  if (!Number.isInteger(input.maxUses) || input.maxUses < 1) {
    throw new BusinessError("Число использований должно быть не меньше одного");
  }
  if (input.validUntil && input.validUntil.getTime() < Date.now()) {
    throw new BusinessError("Дата окончания уже прошла");
  }

  const code = input.code.toUpperCase().trim();
  const [dup] = await db
    .select({ id: s.promocodes.id })
    .from(s.promocodes)
    .where(eq(s.promocodes.code, code))
    .limit(1);

  if (dup) throw new BusinessError(`Промокод «${code}» уже существует`);

  const [promo] = await db
    .insert(s.promocodes)
    .values({
      code,
      discountType: type,
      discountValue: String(value),
      minOrderAmount: String(input.minOrderAmount),
      maxUses: input.maxUses,
      validUntil: input.validUntil ?? null,
    })
    .returning();

  await db.insert(s.activity).values({
    actor: input.actor,
    action: `создал промокод «${promo.code}»`,
    entity: `Скидка ${promo.discountType === "percent" ? `${promo.discountValue}%` : `${promo.discountValue} сум`}`,
  });

  await recordSyncEvent({
    source: "crm",
    target: "all",
    entity: "promocode",
    action: "promocode_created",
    payload: { code: promo.code, discountValue: Number(promo.discountValue) },
  });

  return promo;
}

// ═══ ИНТЕГРАЦИИ ═══
export async function getIntegrations() {
  await init();
  return db.select().from(s.integrations).orderBy(s.integrations.id);
}

export async function saveIntegration(input: {
  key: string;
  credentials: Record<string, string>;
  enabled: boolean;
  actor: string;
}) {
  const hasCreds = Object.values(input.credentials).some((v) => v && v.trim().length > 0);
  const [i] = await db
    .update(s.integrations)
    .set({
      credentials: input.credentials,
      enabled: input.enabled && hasCreds,
      status: hasCreds ? "connected" : "not_configured",
      lastCheckAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(s.integrations.key, input.key))
    .returning();

  await db.insert(s.activity).values({
    actor: input.actor,
    action: `${input.enabled ? "подключил" : "отключил"} интеграцию`,
    entity: i?.title ?? input.key,
  });
  await recordSyncEvent({ source: "crm", target: input.key, entity: "integration", action: "integration_updated", payload: { key: input.key, enabled: input.enabled } });
  return i;
}

export async function testTelegramBot(token: string) {
  if (!token.trim()) return { ok: false, error: "Токен пустой" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`, { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { ok?: boolean; result?: { username?: string; first_name?: string }; description?: string };
    if (data.ok && data.result) {
      return { ok: true, username: data.result.username ?? "", name: data.result.first_name ?? "" };
    }
    return { ok: false, error: data.description ?? "Неверный токен" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ошибка соединения с Telegram" };
  }
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const [tg] = await db.select().from(s.integrations).where(eq(s.integrations.key, "telegram_bot"));
  const token = tg?.credentials?.token;
  if (!tg?.enabled || !token) return { ok: false, error: "Telegram Bot не подключён в настройках" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.description ?? "Ошибка отправки" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ошибка сети" };
  }
}

// ═══ ПУБЛИКАЦИЯ КОНТЕНТА ═══
export async function publishSurface(target: string, actor: string) {
  await db.update(s.contentBlocks).set({ enabled: true, updatedAt: new Date() }).where(eq(s.contentBlocks.surface, target === "miniapp" ? "miniapp" : "site"));
  await db.insert(s.activity).values({ actor, action: `опубликовал изменения`, entity: target === "miniapp" ? "Telegram Mini App" : "Сайт delis.uz" });
  await recordSyncEvent({ source: "crm", target, entity: "content", action: "content_published", payload: { target } });
  return { ok: true };
}

export async function saveSeoSettings(seo: Record<string, string>, actor: string) {
  for (const [key, value] of Object.entries(seo)) {
    const existing = await db.select().from(s.contentBlocks).where(and(eq(s.contentBlocks.surface, "seo"), eq(s.contentBlocks.key, key))).limit(1);
    if (existing.length > 0) {
      await db.update(s.contentBlocks).set({ body: value, updatedAt: new Date() }).where(eq(s.contentBlocks.id, existing[0].id));
    } else {
      await db.insert(s.contentBlocks).values({ surface: "seo", key, title: key, body: value });
    }
  }
  await db.insert(s.activity).values({ actor, action: "обновил SEO-настройки сайта", entity: "delis.uz" });
  await recordSyncEvent({ source: "crm", target: "site", entity: "seo", action: "seo_updated", payload: {} });
  return { ok: true };
}

export async function createInstagramPost(input: {
  type: string; caption: string; mediaUrls: string[]; scheduledAt: string; actor: string;
}) {
  const [post] = await db.insert(s.contentBlocks).values({
    surface: "instagram",
    key: `post_${Date.now()}`,
    title: input.caption.slice(0, 60),
    body: JSON.stringify({ type: input.type, caption: input.caption, media: input.mediaUrls, scheduledAt: input.scheduledAt }),
    enabled: !input.scheduledAt,
  }).returning();

  await db.insert(s.activity).values({
    actor: input.actor,
    action: input.scheduledAt ? "запланировал публикацию в Instagram" : "опубликовал в Instagram",
    entity: `${input.type} · ${input.mediaUrls.length} медиа`,
  });
  await recordSyncEvent({ source: "crm", target: "instagram", entity: "post", action: "post_created", payload: { type: input.type, media: input.mediaUrls.length } });
  return post;
}

export async function saveMiniAppBanners(banners: string[], actor: string) {
  const existing = await db.select().from(s.contentBlocks).where(and(eq(s.contentBlocks.surface, "miniapp"), eq(s.contentBlocks.key, "banners"))).limit(1);
  const body = JSON.stringify(banners);
  if (existing.length > 0) {
    await db.update(s.contentBlocks).set({ body, updatedAt: new Date() }).where(eq(s.contentBlocks.id, existing[0].id));
  } else {
    await db.insert(s.contentBlocks).values({ surface: "miniapp", key: "banners", title: "Баннеры Mini App", body });
  }
  await db.insert(s.activity).values({ actor, action: `загрузил ${banners.length} баннеров в Mini App`, entity: "Telegram Mini App" });
  await recordSyncEvent({ source: "crm", target: "miniapp", entity: "banner", action: "banners_updated", payload: { count: banners.length } });
  return { ok: true };
}

// ═══ БАЗА ЗНАНИЙ ═══

// Уведомление владельца о новом заказе в Telegram
async function notifyOwnerAboutOrder(orderNumber: string, total: string, payment: string, productName: string) {
  const [tg] = await db.select().from(s.integrations).where(eq(s.integrations.key, "telegram_bot")).limit(1);
  const [tgConfig] = await db.select().from(s.contentBlocks).where(and(eq(s.contentBlocks.surface, "telegram"), eq(s.contentBlocks.key, "notifications"))).limit(1);

  let chatId: string | undefined;
  if (tgConfig && tgConfig.body) {
    try { chatId = JSON.parse(tgConfig.body).ownerChatId; } catch { /* ignore */ }
  }
  if (!chatId) chatId = tg?.credentials?.ownerChatId;
  if (!chatId) return; // Telegram не настроен — молча пропускаем

  const token = tg?.credentials?.token;
  if (!token) return;

  const paymentNames: Record<string, string> = { cash: "💵 Наличные", click: "🔵 Click", payme: "🟢 Payme", uzum: "🟣 Uzum", bank: "🏦 Банк", crm: "💻 CRM" };

  const text = `🔔 <b>Новый заказ ${orderNumber}</b>\n\n💰 Сумма: ${Number(total).toLocaleString("ru-RU")} сум\n💳 Оплата: ${paymentNames[payment] ?? payment}\n📦 Товар: ${productName}\n\n<a href="https://delis.uz/orders">Открыть в CRM</a>`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* ignore notification errors */
  }
}
export async function getKnowledgeBase() {
  await init();
  return db.select().from(s.knowledgeBase).orderBy(desc(s.knowledgeBase.isPinned), desc(s.knowledgeBase.views));
}

export async function saveArticle(input: {
  id?: number; title: string; category: string; content: string; icon: string; isPinned: boolean; actor: string;
}) {
  if (input.id) {
    const [a] = await db.update(s.knowledgeBase)
      .set({ title: input.title, category: input.category, content: input.content, icon: input.icon, isPinned: input.isPinned, updatedAt: new Date() })
      .where(eq(s.knowledgeBase.id, input.id)).returning();
    return a;
  }
  const [a] = await db.insert(s.knowledgeBase).values({
    title: input.title, category: input.category, content: input.content,
    icon: input.icon, isPinned: input.isPinned, createdBy: input.actor,
  }).returning();
  await db.insert(s.activity).values({ actor: input.actor, action: "добавил статью в базу знаний", entity: input.title });
  return a;
}

export async function deleteArticle(id: number) {
  await db.delete(s.knowledgeBase).where(eq(s.knowledgeBase.id, id));
  return { ok: true };
}

// ═══ P&L ОТЧЁТ ═══
export async function getPnLReport() {
  await init();

  const byCategory = await db
    .select({
      category: sql<string>`coalesce(cat.name, 'Без категории')`,
      revenue: sql<string>`coalesce(sum(oi.qty * oi.price), 0)`,
      cost: sql<string>`coalesce(sum(oi.qty * p.cost), 0)`,
      units: sql<string>`coalesce(sum(oi.qty), 0)`,
    })
    .from(sql`order_items oi`)
    .innerJoin(sql`products p`, sql`p.id = oi.product_id`)
    .leftJoin(sql`categories cat`, sql`cat.id = p.category_id`)
    .innerJoin(sql`orders o`, sql`o.id = oi.order_id`)
    .where(sql`o.status not in ('cancelled','returned')`)
    .groupBy(sql`cat.name`);

  const byChannel = await db
    .select({
      channel: s.orders.channel,
      revenue: sql<string>`coalesce(sum(total),0)`,
      profit: sql<string>`coalesce(sum(profit),0)`,
      orders: sql<string>`count(*)`,
    })
    .from(s.orders)
    .where(sql`status not in ('cancelled','returned')`)
    .groupBy(s.orders.channel);

  const byMonth = await db
    .select({
      month: sql<string>`to_char(created_at, 'MM.YYYY')`,
      revenue: sql<string>`coalesce(sum(total),0)`,
      profit: sql<string>`coalesce(sum(profit),0)`,
    })
    .from(s.orders)
    .where(sql`status not in ('cancelled','returned')`)
    .groupBy(sql`1, date_trunc('month', created_at)`)
    .orderBy(sql`date_trunc('month', created_at)`);

  const [expenses] = await db
    .select({
      total: sql<string>`coalesce(sum(amount),0)`,
      logistics: sql<string>`coalesce(sum(amount) filter (where category='logistics'),0)`,
      marketing: sql<string>`coalesce(sum(amount) filter (where category='marketing'),0)`,
      salary: sql<string>`coalesce(sum(amount) filter (where category='salary'),0)`,
      production: sql<string>`coalesce(sum(amount) filter (where category='production'),0)`,
      rent: sql<string>`coalesce(sum(amount) filter (where category='rent'),0)`,
    })
    .from(s.transactions)
    .where(eq(s.transactions.kind, "expense"));

  const topProducts = await db
    .select({
      name: s.products.name,
      revenue: sql<string>`coalesce(sum(oi.qty * oi.price),0)`,
      profit: sql<string>`coalesce(sum(oi.qty * (oi.price - p2.cost)),0)`,
      units: sql<string>`coalesce(sum(oi.qty),0)`,
    })
    .from(s.products)
    .innerJoin(sql`order_items oi`, sql`oi.product_id = ${s.products.id}`)
    .innerJoin(sql`products p2`, sql`p2.id = ${s.products.id}`)
    .groupBy(s.products.name)
    .orderBy(sql`sum(oi.qty * (oi.price - p2.cost)) desc`)
    .limit(10);

  return { byCategory, byChannel, byMonth, expenses, topProducts };
}

// ═══ СБРОС ДЕМО-ДАННЫХ ═══
export async function resetDemoData(actor: string, keepSettings = true) {
  await db.execute(sql`
    truncate table order_items, orders, messages, agent_messages, agent_visits,
      stock_moves, purchase_items, purchase_orders, returns, deliveries,
      transactions, campaigns, broadcasts, sync_events, activity, tasks
    restart identity cascade
  `);
  await db.execute(sql`update customers set orders_count = 0, total_spent = 0`);
  await db.execute(sql`update agents set fact = 0, visits = 0`);
  await db.execute(sql`update products set sold = 0`);
  await db.execute(sql`update couriers set active_deliveries = 0, completed_today = 0`);
  await db.execute(sql`update suppliers set total_purchased = 0`);
  if (!keepSettings) {
    await db.execute(sql`update integrations set enabled = false, credentials = '{}'::jsonb, status = 'not_configured'`);
  }
  // Таблицы очищены — возвращаем счётчики номеров к стартовым значениям,
  // иначе они продолжали бы расти относительно уже несуществующих заказов.
  await syncNumberSequences();
  await db.insert(s.activity).values({ actor, action: "очистил демо-данные системы", entity: "Полный сброс операций" });
  return { ok: true };
}

export async function getAgentMessages(agentId: number) {
  await init();
  return db.select().from(s.agentMessages).where(eq(s.agentMessages.agentId, agentId)).orderBy(s.agentMessages.createdAt).limit(50);
}

export async function sendAgentMessage(agentId: number, body: string, fromAdmin = true) {
  const [m] = await db.insert(s.agentMessages).values({ agentId, body, fromAdmin }).returning();
  await recordSyncEvent({ source: fromAdmin ? "crm" : "agent", target: fromAdmin ? "agent" : "crm", entity: "agent_message", action: "message_sent", payload: { agentId } });
  return m;
}

export async function toggleMarketingTrigger(id: number, isActive: boolean, actor: string) {
  const [trig] = await db
    .update(s.marketingTriggers)
    .set({ isActive })
    .where(eq(s.marketingTriggers.id, id))
    .returning();

  if (trig) {
    await db.insert(s.activity).values({
      actor,
      action: `${isActive ? "включил" : "выключил"} маркетинг-триггер`,
      entity: trig.title,
    });
    await recordSyncEvent({
      source: "crm",
      target: "telegram_bot",
      entity: "marketing_trigger",
      action: "trigger_status_changed",
      payload: { id, isActive },
    });
  }
  return trig;
}
