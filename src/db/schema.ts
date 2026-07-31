import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  kind: text("kind").notNull().default("home"), // home | auto
  icon: text("icon").notNull().default("🧴"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sku: text("sku").notNull(),
  barcode: text("barcode").notNull().default(""),
  categoryId: integer("category_id"),
  description: text("description").notNull().default(""),
  brand: text("brand").notNull().default("DELIS"),
  country: text("country").notNull().default("Uzbekistan"),
  volume: text("volume").notNull().default("1 L"),
  weight: numeric("weight").notNull().default("1"),
  price: numeric("price").notNull().default("0"),
  cost: numeric("cost").notNull().default("0"),
  vat: integer("vat").notNull().default(12),
  discount: integer("discount").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  lowStock: integer("low_stock").notNull().default(20),
  image: text("image").notNull().default(""),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  color: text("color").notNull().default("#8b5cf6"),
  isPopular: boolean("is_popular").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: text("status").notNull().default("active"),
  sold: integer("sold").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  username: text("username").notNull().default(""),
  telegramId: text("telegram_id").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default("Tashkent"),
  region: text("region").notNull().default("Toshkent"),
  address: text("address").notNull().default(""),
  language: text("language").notNull().default("ru"),
  source: text("source").notNull().default("telegram"),
  isVip: boolean("is_vip").notNull().default(false),
  bonus: integer("bonus").notNull().default(0),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  ordersCount: integer("orders_count").notNull().default(0),
  totalSpent: numeric("total_spent").notNull().default("0"),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  customerId: integer("customer_id"),
  agentId: integer("agent_id"),
  status: text("status").notNull().default("new"),
  channel: text("channel").notNull().default("miniapp"),
  payment: text("payment").notNull().default("click"),
  total: numeric("total").notNull().default("0"),
  profit: numeric("profit").notNull().default("0"),
  comment: text("comment").notNull().default(""),
  timeline: jsonb("timeline").$type<{ status: string; at: string; by: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
  price: numeric("price").notNull().default("0"),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  telegram: text("telegram").notNull().default(""),
  email: text("email").notNull().default(""),
  region: text("region").notNull().default("Toshkent"),
  route: text("route").notNull().default(""),
  plan: numeric("plan").notNull().default("0"),
  fact: numeric("fact").notNull().default("0"),
  commission: integer("commission").notNull().default(7),
  visits: integer("visits").notNull().default(0),
  status: text("status").notNull().default("active"),
  avatarColor: text("avatar_color").notNull().default("#8b5cf6"),
});

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // telegram_bot | click | payme | uzum | smtp | sms
  title: text("title").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  credentials: jsonb("credentials").$type<Record<string, string>>().notNull().default({}),
  status: text("status").notNull().default("not_configured"), // not_configured | connected | error
  lastCheckAt: timestamp("last_check_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"),
  content: text("content").notNull().default(""),
  icon: text("icon").notNull().default("📄"),
  views: integer("views").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdBy: text("created_by").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agentMessages = pgTable("agent_messages", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  body: text("body").notNull(),
  fromAdmin: boolean("from_admin").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  assignee: text("assignee").notNull().default(""),
  priority: text("priority").notNull().default("mid"), // high | mid | low
  status: text("status").notNull().default("todo"), // todo | in_progress | done
  linkType: text("link_type").notNull().default(""), // order | customer | agent | supplier
  linkLabel: text("link_label").notNull().default(""),
  dueAt: timestamp("due_at"),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agentVisits = pgTable("agent_visits", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  storeName: text("store_name").notNull(),
  storeAddress: text("store_address").notNull().default(""),
  gpsCoords: text("gps_coords").notNull().default("41.2858, 69.2035"),
  status: text("status").notNull().default("order_placed"), // order_placed | completed | no_order
  orderTotal: numeric("order_total").notNull().default("0"),
  notes: text("notes").notNull().default(""),
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  visitedAt: timestamp("visited_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // income | expense
  category: text("category").notNull().default("sales"),
  account: text("account").notNull().default("click"),
  amount: numeric("amount").notNull().default("0"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  body: text("body").notNull(),
  fromAdmin: boolean("from_admin").notNull().default(false),
  kind: text("kind").notNull().default("text"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
});

export const stockMoves = pgTable("stock_moves", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  kind: text("kind").notNull(), // in | out | transfer | writeoff
  qty: integer("qty").notNull().default(0),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  login: text("login").notNull().default(""),
  email: text("email").notNull().default(""),
  role: text("role").notNull().default("manager"),
  status: text("status").notNull().default("active"),
  lastIp: text("last_ip").notNull().default("94.158.0.1"),
  device: text("device").notNull().default("MacBook Pro · Chrome"),
  twoFa: boolean("two_fa").notNull().default(false),
  passwordHash: text("password_hash").notNull().default(""),
  lastLoginAt: timestamp("last_login_at").notNull().defaultNow(),
});

export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  device: text("device").notNull().default(""),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const syncEvents = pgTable("sync_events", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().default("crm"),
  target: text("target").notNull().default("all"),
  entity: text("entity").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull().default("synced"),
  payload: jsonb("payload").$type<Record<string, string | number | boolean>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contentBlocks = pgTable("content_blocks", {
  id: serial("id").primaryKey(),
  surface: text("surface").notNull(), // site | miniapp | instagram
  key: text("key").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  recipients: integer("recipients").notNull().default(0),
  channel: text("channel").notNull().default("telegram"),
  status: text("status").notNull().default("sent"), // draft | scheduled | sent
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  country: text("country").notNull().default("Uzbekistan"),
  city: text("city").notNull().default("Tashkent"),
  address: text("address").notNull().default(""),
  inn: text("inn").notNull().default(""),
  category: text("category").notNull().default("chemicals"),
  rating: integer("rating").notNull().default(5),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  totalPurchased: numeric("total_purchased").notNull().default("0"),
  status: text("status").notNull().default("active"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  supplierId: integer("supplier_id").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | confirmed | shipped | received | cancelled
  total: numeric("total").notNull().default("0"),
  paid: numeric("paid").notNull().default("0"),
  expectedAt: timestamp("expected_at"),
  receivedAt: timestamp("received_at"),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
  price: numeric("price").notNull().default("0"),
});

export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  customerId: integer("customer_id"),
  reason: text("reason").notNull().default("defect"),
  status: text("status").notNull().default("pending"), // pending | approved | refunded | rejected
  refundAmount: numeric("refund_amount").notNull().default("0"),
  restockItems: boolean("restock_items").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couriers = pgTable("couriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  vehicle: text("vehicle").notNull().default("car"),
  zone: text("zone").notNull().default("Tashkent"),
  status: text("status").notNull().default("available"), // available | busy | offline
  activeDeliveries: integer("active_deliveries").notNull().default(0),
  completedToday: integer("completed_today").notNull().default(0),
  rating: integer("rating").notNull().default(5),
  avatarColor: text("avatar_color").notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  courierId: integer("courier_id"),
  status: text("status").notNull().default("pending"), // pending | assigned | picked_up | in_transit | delivered | failed
  address: text("address").notNull().default(""),
  city: text("city").notNull().default("Tashkent"),
  scheduledAt: timestamp("scheduled_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  channel: text("channel").notNull().default("telegram"),
  attachments: jsonb("attachments").$type<string[]>().notNull().default([]),
  segment: jsonb("segment").$type<Record<string, string | number | boolean>>().notNull().default({}),
  recipients: integer("recipients").notNull().default(0),
  delivered: integer("delivered").notNull().default(0),
  status: text("status").notNull().default("sent"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const promocodes = pgTable("promocodes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("percent"), // percent | fixed
  discountValue: numeric("discount_value").notNull().default("15"),
  minOrderAmount: numeric("min_order_amount").notNull().default("100000"),
  maxUses: integer("max_uses").notNull().default(100),
  usedCount: integer("used_count").notNull().default(0),
  status: text("status").notNull().default("active"), // active | paused | expired
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const marketingTriggers = pgTable("marketing_triggers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  eventKey: text("event_key").notNull(), // abandoned_cart | sleeping_customer | vip_threshold | birthday
  actionType: text("action_type").notNull().default("discount_message"),
  messageBody: text("message_body").notNull(),
  discountBonus: integer("discount_bonus").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  triggeredCount: integer("triggered_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
