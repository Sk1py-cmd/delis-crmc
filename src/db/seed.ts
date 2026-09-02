import { db } from "@/db";
import * as s from "@/db/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/server/password";

let seeded: Promise<void> | null = null;

const DDL = `
create table if not exists categories (id serial primary key, name text not null, slug text not null, kind text not null default 'home', icon text not null default '🧴', created_at timestamp not null default now());
create table if not exists products (id serial primary key, name text not null, slug text not null, sku text not null, barcode text not null default '', category_id integer, description text not null default '', brand text not null default 'DELIS', country text not null default 'Uzbekistan', volume text not null default '1 L', weight numeric not null default 1, price numeric not null default 0, cost numeric not null default 0, vat integer not null default 12, discount integer not null default 0, stock integer not null default 0, low_stock integer not null default 20, image text not null default '', images jsonb not null default '[]'::jsonb, color text not null default '#8b5cf6', is_popular boolean not null default false, is_new boolean not null default false, is_featured boolean not null default false, status text not null default 'active', sold integer not null default 0, created_at timestamp not null default now());
create table if not exists customers (id serial primary key, first_name text not null, last_name text not null default '', username text not null default '', telegram_id text not null default '', phone text not null default '', email text not null default '', city text not null default 'Tashkent', region text not null default 'Toshkent', address text not null default '', language text not null default 'ru', source text not null default 'telegram', is_vip boolean not null default false, bonus integer not null default 0, tags jsonb not null default '[]'::jsonb, notes text not null default '', orders_count integer not null default 0, total_spent numeric not null default 0, last_active_at timestamp not null default now(), created_at timestamp not null default now());
create table if not exists orders (id serial primary key, number text not null, customer_id integer, agent_id integer, status text not null default 'new', channel text not null default 'miniapp', payment text not null default 'click', total numeric not null default 0, profit numeric not null default 0, comment text not null default '', timeline jsonb not null default '[]'::jsonb, created_at timestamp not null default now());
create table if not exists order_items (id serial primary key, order_id integer not null, product_id integer not null, name text not null, qty integer not null default 1, price numeric not null default 0);
create table if not exists agents (id serial primary key, name text not null, phone text not null default '', telegram text not null default '', email text not null default '', region text not null default 'Toshkent', route text not null default '', plan numeric not null default 0, fact numeric not null default 0, commission integer not null default 7, visits integer not null default 0, status text not null default 'active', avatar_color text not null default '#8b5cf6');
create table if not exists transactions (id serial primary key, kind text not null, category text not null default 'sales', account text not null default 'click', amount numeric not null default 0, note text not null default '', created_at timestamp not null default now());
create table if not exists messages (id serial primary key, customer_id integer not null, body text not null, from_admin boolean not null default false, kind text not null default 'text', read_at timestamp, created_at timestamp not null default now());
create table if not exists templates (id serial primary key, title text not null, body text not null);
create table if not exists stock_moves (id serial primary key, product_id integer not null, kind text not null, qty integer not null default 0, note text not null default '', created_at timestamp not null default now());
create table if not exists users (id serial primary key, name text not null, email text not null, role text not null default 'manager', status text not null default 'active', last_ip text not null default '94.158.0.1', device text not null default 'MacBook Pro · Chrome', two_fa boolean not null default false, last_login_at timestamp not null default now());
create table if not exists activity (id serial primary key, actor text not null, action text not null, entity text not null default '', created_at timestamp not null default now());
create table if not exists content_blocks (id serial primary key, surface text not null, "key" text not null, title text not null, body text not null default '', enabled boolean not null default true, updated_at timestamp not null default now());
create table if not exists sessions (id serial primary key, token text not null unique, user_id integer not null, device text not null default '', expires_at timestamp not null, created_at timestamp not null default now());
alter table users add column if not exists password_hash text not null default '';
alter table users add column if not exists login text not null default '';
create table if not exists sync_events (id serial primary key, source text not null default 'crm', target text not null default 'all', entity text not null, action text not null, status text not null default 'synced', payload jsonb not null default '{}'::jsonb, created_at timestamp not null default now());
create table if not exists broadcasts (id serial primary key, title text not null default '', body text not null default '', recipients integer not null default 0, channel text not null default 'telegram', status text not null default 'sent', scheduled_at timestamp, sent_at timestamp not null default now(), created_by text not null default '', created_at timestamp not null default now());
create table if not exists campaigns (id serial primary key, title text not null default '', body text not null, channel text not null default 'telegram', attachments jsonb not null default '[]'::jsonb, segment jsonb not null default '{}'::jsonb, recipients integer not null default 0, delivered integer not null default 0, status text not null default 'sent', scheduled_at timestamp, created_at timestamp not null default now());
create table if not exists promocodes (id serial primary key, code text not null unique, discount_type text not null default 'percent', discount_value numeric not null default 15, min_order_amount numeric not null default 100000, max_uses integer not null default 100, used_count integer not null default 0, status text not null default 'active', valid_until timestamp, created_at timestamp not null default now());
create table if not exists marketing_triggers (id serial primary key, title text not null, event_key text not null, action_type text not null default 'discount_message', message_body text not null, discount_bonus integer not null default 0, is_active boolean not null default true, triggered_count integer not null default 0, created_at timestamp not null default now());
create table if not exists suppliers (id serial primary key, name text not null, contact_person text not null default '', phone text not null default '', email text not null default '', country text not null default 'Uzbekistan', city text not null default 'Tashkent', address text not null default '', inn text not null default '', category text not null default 'chemicals', rating integer not null default 5, lead_time_days integer not null default 7, total_purchased numeric not null default 0, status text not null default 'active', notes text not null default '', created_at timestamp not null default now());
create table if not exists purchase_orders (id serial primary key, number text not null, supplier_id integer not null, status text not null default 'draft', total numeric not null default 0, paid numeric not null default 0, expected_at timestamp, received_at timestamp, notes text not null default '', created_by text not null default '', created_at timestamp not null default now());
create table if not exists purchase_items (id serial primary key, purchase_order_id integer not null, product_id integer not null, name text not null, qty integer not null default 1, price numeric not null default 0);
create table if not exists returns (id serial primary key, order_id integer not null, customer_id integer, reason text not null default 'defect', status text not null default 'pending', refund_amount numeric not null default 0, restock_items boolean not null default false, notes text not null default '', created_by text not null default '', created_at timestamp not null default now());
create table if not exists couriers (id serial primary key, name text not null, phone text not null default '', vehicle text not null default 'car', zone text not null default 'Tashkent', status text not null default 'available', active_deliveries integer not null default 0, completed_today integer not null default 0, rating integer not null default 5, avatar_color text not null default '#3b82f6', created_at timestamp not null default now());
create table if not exists deliveries (id serial primary key, order_id integer not null, courier_id integer, status text not null default 'pending', address text not null default '', city text not null default 'Tashkent', scheduled_at timestamp, delivered_at timestamp, notes text not null default '', created_at timestamp not null default now());
create table if not exists agent_visits (id serial primary key, agent_id integer not null, store_name text not null, store_address text not null default '', gps_coords text not null default '41.2858, 69.2035', status text not null default 'order_placed', order_total numeric not null default 0, notes text not null default '', photos jsonb not null default '[]'::jsonb, visited_at timestamp not null default now());
create table if not exists tasks (id serial primary key, title text not null, description text not null default '', assignee text not null default '', priority text not null default 'mid', status text not null default 'todo', link_type text not null default '', link_label text not null default '', due_at timestamp, created_by text not null default '', created_at timestamp not null default now());
create table if not exists agent_messages (id serial primary key, agent_id integer not null, body text not null, from_admin boolean not null default false, read_at timestamp, created_at timestamp not null default now());
create table if not exists integrations (id serial primary key, key text not null unique, title text not null, enabled boolean not null default false, credentials jsonb not null default '{}'::jsonb, status text not null default 'not_configured', last_check_at timestamp, updated_at timestamp not null default now());
create table if not exists knowledge_base (id serial primary key, title text not null, category text not null default 'general', content text not null default '', icon text not null default '📄', views integer not null default 0, is_pinned boolean not null default false, created_by text not null default '', updated_at timestamp not null default now(), created_at timestamp not null default now());
`;

async function createTables() {
  await db.execute(sql.raw(DDL));
}

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "delis2026";

async function ensureAdmin() {
  const hash = hashPassword(OWNER_PASSWORD);
  await db.execute(
    sql`insert into users (name, login, email, role, password_hash, two_fa)
        select 'Музаффар', 'owner', 'owner@delis.uz', 'owner', ${hash}, true
        where not exists (select 1 from users where login = 'owner')`,
  );
  await db.execute(
    sql`update users set password_hash = ${hash}, login = 'owner', role = 'owner', two_fa = true where login = 'owner' or email = 'owner@delis.uz'`,
  );
}

const CATEGORIES = [
  { name: "Home Care", slug: "home-care", kind: "home", icon: "🏠" },
  { name: "Auto Care", slug: "auto-care", kind: "auto", icon: "🚗" },
  { name: "Kitchen", slug: "kitchen", kind: "home", icon: "🍽️" },
  { name: "Bathroom", slug: "bathroom", kind: "home", icon: "🛁" },
  { name: "Laundry", slug: "laundry", kind: "home", icon: "🧺" },
];

const PRODUCTS: [string, number, string, number, number, string][] = [
  ["DELIS Car Shampoo Active Foam", 2, "🚗", 42000, 24000, "5 L"],
  ["DELIS Wax Protect Ceramic", 2, "✨", 89000, 51000, "500 ml"],
  ["DELIS Glass Cleaner Crystal", 2, "🪟", 21000, 11000, "750 ml"],
  ["DELIS Engine Cleaner Pro", 2, "⚙️", 64000, 37000, "1 L"],
  ["DELIS Universal Cleaner Fresh", 1, "🧴", 27000, 14000, "1 L"],
  ["DELIS Floor Cleaner Lavender", 1, "🧹", 31000, 16500, "2 L"],
  ["DELIS Dishwashing Gel Lemon", 3, "🍋", 18000, 8900, "1 L"],
  ["DELIS Dishwashing Gel Aloe", 3, "🌿", 19500, 9400, "1 L"],
  ["DELIS Laundry Gel Color", 5, "🧺", 74000, 44000, "3 L"],
  ["DELIS Laundry Gel White", 5, "🤍", 76000, 45000, "3 L"],
  ["DELIS Fabric Softener Silk", 5, "🌸", 39000, 21000, "2 L"],
  ["DELIS Bathroom Anti-Calc", 4, "🛁", 29000, 15000, "750 ml"],
  ["DELIS Toilet Gel Ocean", 4, "🌊", 17000, 8000, "750 ml"],
  ["DELIS Kitchen Degreaser Max", 3, "🔥", 33000, 17500, "1 L"],
  ["DELIS Tire Shine Black", 2, "🛞", 47000, 25000, "600 ml"],
  ["DELIS Interior Detailer Silk", 2, "🪑", 55000, 29000, "500 ml"],
];

const NAMES: [string, string, string][] = [
  ["Азиз", "Каримов", "azizkarimov"],
  ["Дилноза", "Рахимова", "dilnoza_r"],
  ["Тимур", "Сафаров", "timursaf"],
  ["Малика", "Юсупова", "malika_y"],
  ["Бекзод", "Тураев", "bekzod_t"],
  ["Нилуфар", "Хасанова", "nilufar_h"],
  ["Жасур", "Ортиков", "jasur_o"],
  ["Камила", "Абдуллаева", "kamila_a"],
  ["Рустам", "Эргашев", "rustam_e"],
  ["Севара", "Мирзаева", "sevara_m"],
  ["Отабек", "Нурматов", "otabek_n"],
  ["Гулнора", "Саидова", "gulnora_s"],
];

const CITIES = ["Tashkent", "Samarkand", "Bukhara", "Andijan", "Fergana", "Namangan"];
const SOURCES = ["telegram", "miniapp", "website", "instagram", "agent", "facebook"];
const STATUSES = ["new", "confirmed", "processing", "paid", "packed", "courier", "shipped", "delivered", "cancelled", "returned"];

function rnd(n: number) {
  return Math.floor(Math.random() * n);
}

async function run() {
  await createTables();
  await ensureAdmin();
  const existing = await db.execute<{ count: string }>(sql`select count(*)::text as count from products`);
  if (Number(existing.rows[0]?.count ?? "0") > 0) return;

  const cats = await db.insert(s.categories).values(CATEGORIES).returning();

  const PROD_IMAGES = [
  "https://picsum.photos/id/1011/800/600",
  "https://picsum.photos/id/160/800/600",
  "https://picsum.photos/id/201/800/600",
  "https://picsum.photos/id/251/800/600",
  "https://picsum.photos/id/29/800/600",
  "https://picsum.photos/id/30/800/600",
  "https://picsum.photos/id/48/800/600",
  "https://picsum.photos/id/60/800/600",
];

const prodRows = PRODUCTS.map(([name, catIdx, icon, price, cost, volume], i) => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    sku: `DLS-${1000 + i}`,
    barcode: `48600${100000 + i}`,
    categoryId: cats[catIdx - 1]?.id ?? cats[0].id,
    description: `Профессиональное средство ${name} от DELIS. Концентрированная формула, безопасно для поверхностей, экономичный расход.`,
    volume,
    price: String(price),
    cost: String(cost),
    stock: 12 + rnd(400),
    image: PROD_IMAGES[i % PROD_IMAGES.length],
    images: [
      PROD_IMAGES[i % PROD_IMAGES.length],
      PROD_IMAGES[(i + 1) % PROD_IMAGES.length],
      PROD_IMAGES[(i + 2) % PROD_IMAGES.length],
    ],
    isPopular: i % 3 === 0,
    isNew: i % 5 === 0,
    isFeatured: i % 4 === 0,
    sold: 40 + rnd(900),
  }));
  const prods = await db.insert(s.products).values(prodRows).returning();

  const custRows = NAMES.map(([f, l, u], i) => ({
    firstName: f,
    lastName: l,
    username: u,
    telegramId: String(500000000 + i * 13337),
    phone: `+9989${rnd(9)}${1000000 + rnd(8999999)}`,
    email: `${u}@mail.uz`,
    city: CITIES[i % CITIES.length],
    source: SOURCES[i % SOURCES.length],
    isVip: i % 4 === 0,
    bonus: rnd(120) * 1000,
    tags: i % 4 === 0 ? ["VIP", "Опт"] : ["Розница"],
    address: `ул. Амира Темура, ${10 + i}`,
  }));
  const custs = await db.insert(s.customers).values(custRows).returning();

  const agentRows = [
    ["Шохрух Абдуллаев", "Toshkent", "Чиланзар — Юнусабад", 120_000_000, "#8b5cf6"],
    ["Диёр Комилов", "Samarqand", "Центр — Ургут", 80_000_000, "#3b82f6"],
    ["Азамат Юлдашев", "Farg'ona", "Фергана — Маргилан", 65_000_000, "#22c55e"],
    ["Мадина Хамидова", "Buxoro", "Бухара — Гиждуван", 54_000_000, "#f97316"],
    ["Санжар Ниязов", "Andijon", "Андижан — Асака", 47_000_000, "#ec4899"],
  ].map(([name, region, route, plan, color], i) => ({
    name: String(name),
    region: String(region),
    route: String(route),
    plan: String(plan),
    fact: String(Math.round(Number(plan) * (0.55 + Math.random() * 0.7))),
    phone: `+9989${rnd(9)}${1000000 + rnd(8999999)}`,
    telegram: `@delis_agent_${i + 1}`,
    email: `agent${i + 1}@delis.uz`,
    visits: 20 + rnd(120),
    commission: 5 + rnd(6),
    avatarColor: String(color),
  }));
  const ags = await db.insert(s.agents).values(agentRows).returning();

  const now = Date.now();

  await db.insert(s.agentVisits).values([
    {
      agentId: ags[0].id,
      storeName: "Автомойка LUX Чиланзар",
      storeAddress: "г. Ташкент, ул. Бунёдкор, 24",
      gpsCoords: "41.2858, 69.2035",
      status: "order_placed",
      orderTotal: "450000",
      notes: "Выкладка на стенде проверена, заказана пена и керамический воск",
      photos: ["https://picsum.photos/id/1011/800/600"],
      visitedAt: new Date(now - 2 * 3600_000),
    },
    {
      agentId: ags[0].id,
      storeName: "Детейлинг центр Prestige",
      storeAddress: "г. Ташкент, ул. Нукусская, 88",
      gpsCoords: "41.3111, 69.2797",
      status: "order_placed",
      orderTotal: "1200000",
      notes: "Крупный клиент. Презентовали новую линейку для очистки кузова",
      photos: ["https://picsum.photos/id/160/800/600", "https://picsum.photos/id/201/800/600"],
      visitedAt: new Date(now - 6 * 3600_000),
    },
    {
      agentId: ags[0].id,
      storeName: "Магазин Хозтовары Юнусабад",
      storeAddress: "г. Ташкент, кв. 4, дом 12",
      gpsCoords: "41.3667, 69.2833",
      status: "order_placed",
      orderTotal: "340000",
      notes: "Заказали гель для посуды и универсальные чистящие средства",
      photos: ["https://picsum.photos/id/251/800/600"],
      visitedAt: new Date(now - 24 * 3600_000),
    },
    {
      agentId: ags[1].id,
      storeName: "Автосервис PRO Самарканд",
      storeAddress: "г. Самарканд, ул. Гагарина, 41",
      gpsCoords: "39.6542, 66.9597",
      status: "order_placed",
      orderTotal: "780000",
      notes: "Доставлен каталог и прайс-лист, отличная проходимость",
      photos: ["https://picsum.photos/id/48/800/600"],
      visitedAt: new Date(now - 12 * 3600_000),
    },
    {
      agentId: ags[3].id,
      storeName: "Мойка 24/7 Бухара",
      storeAddress: "г. Бухара, ул. Навои, 15",
      gpsCoords: "39.7681, 64.4556",
      status: "completed",
      orderTotal: "0",
      notes: "Остатки шампуня ещё есть, следующий заказ планируют через неделю",
      photos: ["https://picsum.photos/id/60/800/600"],
      visitedAt: new Date(now - 4 * 3600_000),
    },
  ]);
  for (let i = 0; i < 68; i++) {
    const cust = custs[rnd(custs.length)];
    const agent = ags[rnd(ags.length)];
    const created = new Date(now - rnd(30) * 86400000 - rnd(86400000));
    const status = i < 8 ? STATUSES[i % 4] : STATUSES[rnd(STATUSES.length)];
    const items = Array.from({ length: 1 + rnd(3) }, () => {
      const p = prods[rnd(prods.length)];
      return { product: p, qty: 1 + rnd(6) };
    });
    const total = items.reduce((a, it) => a + Number(it.product.price) * it.qty, 0);
    const cost = items.reduce((a, it) => a + Number(it.product.cost) * it.qty, 0);
    const [order] = await db
      .insert(s.orders)
      .values({
        number: `DLS-${24000 + i}`,
        customerId: cust.id,
        agentId: agent.id,
        status,
        channel: SOURCES[rnd(SOURCES.length)],
        payment: ["click", "payme", "uzum", "cash", "bank"][rnd(5)],
        total: String(total),
        profit: String(total - cost),
        createdAt: created,
        timeline: [{ status: "new", at: created.toISOString(), by: "Telegram Bot" }],
      })
      .returning();
    await db.insert(s.orderItems).values(
      items.map((it) => ({
        orderId: order.id,
        productId: it.product.id,
        name: it.product.name,
        qty: it.qty,
        price: it.product.price,
      })),
    );
    if (status !== "cancelled") {
      await db.insert(s.transactions).values({
        kind: "income",
        category: "sales",
        account: order.payment,
        amount: String(total),
        note: `Оплата заказа ${order.number}`,
        createdAt: created,
      });
    }
  }

  await db.execute(sql`
    update customers c set orders_count = x.cnt, total_spent = x.sum
    from (select customer_id, count(*) as cnt, sum(total) as sum from orders group by customer_id) x
    where x.customer_id = c.id`);

  const expenses = [
    ["logistics", "Доставка и логистика", 28_000_000],
    ["marketing", "Реклама Instagram / Telegram Ads", 41_000_000],
    ["salary", "Зарплата команды", 96_000_000],
    ["production", "Сырьё и тара", 132_000_000],
    ["rent", "Аренда склада", 22_000_000],
  ];
  await db.insert(s.transactions).values(
    expenses.flatMap(([category, note, amount]) =>
      Array.from({ length: 3 }, (_, k) => ({
        kind: "expense",
        category: String(category),
        account: "bank",
        amount: String(Math.round(Number(amount) / 3)),
        note: String(note),
        createdAt: new Date(now - k * 9 * 86400000),
      })),
    ),
  );

  const chats = [
    [0, "Здравствуйте! Есть ли в наличии автошампунь 5 литров?", false],
    [0, "Здравствуйте! Да, DELIS Car Shampoo Active Foam 5 L в наличии — 42 000 сум.", true],
    [0, "Отлично, оформите 3 штуки на Чиланзар.", false],
    [1, "Когда придёт мой заказ DLS-24012?", false],
    [1, "Заказ передан курьеру, доставка сегодня до 18:00 🚚", true],
    [2, "Можно оптовый прайс?", false],
    [3, "Спасибо, гель для посуды супер 👍", false],
    [4, "Есть скидка при заказе от 20 шт?", false],
    [4, "Да, от 20 штук действует скидка 12% и бесплатная доставка.", true],
    [5, "Отправьте счёт на оплату, пожалуйста.", false],
  ];
  await db.insert(s.messages).values(
    chats.map(([ci, body, admin], i) => ({
      customerId: custs[Number(ci)].id,
      body: String(body),
      fromAdmin: Boolean(admin),
      createdAt: new Date(now - (chats.length - i) * 900000),
    })),
  );

  await db.insert(s.templates).values([
    { title: "Заказ принят", body: "Ваш заказ принят ✅ Мы свяжемся с вами для подтверждения." },
    { title: "Заказ собирается", body: "Ваш заказ собирается на складе DELIS 📦" },
    { title: "Передан курьеру", body: "Заказ передан курьеру 🚚 Ожидайте доставку сегодня." },
    { title: "Доставлен", body: "Заказ доставлен 🎉 Спасибо, что выбираете DELIS!" },
    { title: "Персональная скидка", body: "Дарим вам персональную скидку 15% на следующий заказ 💜" },
    { title: "Новый товар", body: "Новинка DELIS уже в каталоге — попробуйте первыми ✨" },
  ]);

  await db.insert(s.stockMoves).values(
    Array.from({ length: 18 }, (_, i) => ({
      productId: prods[rnd(prods.length)].id,
      kind: ["in", "out", "transfer", "writeoff"][rnd(4)],
      qty: 5 + rnd(200),
      note: ["Поставка от производителя", "Отгрузка заказа", "Перемещение на склад №2", "Списание брака"][rnd(4)],
      createdAt: new Date(now - rnd(20) * 86400000),
    })),
  );

  await db.insert(s.users).values([
    { name: "Музаффар", email: "owner@delis.uz", role: "owner", twoFa: true },
    { name: "Азиза Мансурова", email: "admin@delis.uz", role: "admin", twoFa: true },
    { name: "Фаррух Юсупов", email: "manager@delis.uz", role: "manager" },
    { name: "Улугбек Сотволдиев", email: "warehouse@delis.uz", role: "warehouse" },
    { name: "Нигора Расулова", email: "support@delis.uz", role: "support" },
    { name: "Шохрух Абдуллаев", email: "agent@delis.uz", role: "agent" },
  ]);

  await db.insert(s.activity).values([
    { actor: "Азиза Мансурова", action: "изменила цену товара", entity: "DELIS Wax Protect Ceramic" },
    { actor: "Улугбек Сотволдиев", action: "принял поставку 400 шт", entity: "Склад №1" },
    { actor: "Фаррух Юсупов", action: "подтвердил заказ", entity: "DLS-24031" },
    { actor: "Telegram Bot", action: "новый клиент из Mini App", entity: "@sevara_m" },
    { actor: "Нигора Расулова", action: "ответила в чате", entity: "@dilnoza_r" },
  ]);

  await db.insert(s.broadcasts).values([
    { title: "Скидка 20% на авто-химию", body: "💜 DELIS: новая акция — скидка 20% на всю авто-химию до конца недели. Промокод DELIS20", recipients: 11, channel: "telegram", status: "sent", createdBy: "Музаффар", sentAt: new Date(now - 2 * 86400000) },
    { title: "Новинка: Laundry Gel", body: "Встречайте новый гель для стирки DELIS Color — бережная забота о ярких тканях 🌸", recipients: 12, channel: "telegram", status: "sent", createdBy: "Азиза Мансурова", sentAt: new Date(now - 5 * 86400000) },
    { title: "VIP-программа", body: "Дорогие VIP-клиенты! Для вас открыта персональная скидка 15% на весь ассортимент ⭐", recipients: 3, channel: "telegram", status: "sent", createdBy: "Музаффар", sentAt: new Date(now - 8 * 86400000) },
  ]);

  await db.insert(s.syncEvents).values([
    { source: "telegram_bot", target: "crm", entity: "customer", action: "customer_registered", status: "synced", payload: { username: "sevara_m", channel: "miniapp" } },
    { source: "crm", target: "warehouse", entity: "order", action: "stock_reserved", status: "synced", payload: { order: "DLS-24031" } },
    { source: "crm", target: "site", entity: "product", action: "price_updated", status: "synced", payload: { sku: "DLS-1001" } },
    { source: "crm", target: "telegram_mini_app", entity: "banner", action: "banner_published", status: "synced", payload: { surface: "home" } },
    { source: "crm", target: "finance", entity: "payment", action: "payment_confirmed", status: "synced", payload: { provider: "uzum" } },
  ]);

  await db.insert(s.contentBlocks).values([
    { surface: "site", key: "home", title: "Главная страница", body: "DELIS — профессиональная химия для дома и авто" },
    { surface: "site", key: "catalog", title: "Каталог", body: "16 товаров, 5 категорий" },
    { surface: "site", key: "faq", title: "FAQ", body: "12 вопросов" },
    { surface: "site", key: "blog", title: "Блог", body: "8 статей" },
    { surface: "miniapp", key: "banners", title: "Баннеры Mini App", body: "3 активных баннера" },
    { surface: "miniapp", key: "splash", title: "Splash Screen", body: "Логотип DELIS + градиент" },
    { surface: "miniapp", key: "bottomnav", title: "Bottom Navigation", body: "Каталог · Корзина · Заказы · Профиль" },
    { surface: "instagram", key: "plan", title: "Контент-план", body: "14 публикаций на месяц" },
    { surface: "instagram", key: "banners", title: "Баннеры и шаблоны", body: "6 шаблонов сторис" },
  ]);

  await db.insert(s.integrations).values([
    { key: "telegram_bot", title: "Telegram Bot", enabled: false, status: "not_configured", credentials: {} },
    { key: "click", title: "Click (платежи)", enabled: false, status: "not_configured", credentials: {} },
    { key: "payme", title: "Payme (платежи)", enabled: false, status: "not_configured", credentials: {} },
    { key: "uzum", title: "Uzum Bank (платежи)", enabled: false, status: "not_configured", credentials: {} },
    { key: "smtp", title: "Email / SMTP", enabled: false, status: "not_configured", credentials: {} },
    { key: "sms", title: "SMS-шлюз (Eskiz.uz)", enabled: false, status: "not_configured", credentials: {} },
  ]);

  await db.insert(s.knowledgeBase).values([
    { title: "Как оформить заказ клиента", category: "sales", icon: "🧾", isPinned: true, views: 142, createdBy: "Музаффар", content: "1. Откройте раздел «Заказы» → «Новый заказ».\n2. Выберите клиента из базы или создайте нового.\n3. Добавьте товары из каталога, укажите количество.\n4. Проверьте сумму и способ оплаты.\n5. Нажмите «Создать заказ» — остатки склада уменьшатся автоматически.\n6. Распечатайте счёт или чек через кнопки в карточке заказа." },
    { title: "Приём товара на склад", category: "warehouse", icon: "📦", isPinned: true, views: 98, createdBy: "Музаффар", content: "1. Раздел «Поставщики» → вкладка «Закупки».\n2. Найдите нужную закупку со статусом «В пути» или «Подтверждена».\n3. Пересчитайте фактическое количество товара.\n4. Нажмите «Принять» — остатки увеличатся, расход уйдёт в финансы.\n5. Если есть расхождения — проведите инвентаризацию в разделе «Склад»." },
    { title: "Работа с возвратами", category: "sales", icon: "🔄", views: 64, createdBy: "Азиза Мансурова", content: "1. Раздел «Возвраты» → «Оформить возврат».\n2. Выберите заказ и укажите причину (брак, не тот товар, повреждение).\n3. Добавьте комментарий клиента.\n4. Далее два варианта:\n   • «+ склад» — деньги возвращаются, товар принимается обратно\n   • «Возврат ₽» — только деньги (товар бракованный)\n5. Расход автоматически проводится в финансах." },
    { title: "Регламент работы торгового агента", category: "agents", icon: "🧑‍💼", isPinned: true, views: 187, createdBy: "Музаффар", content: "ЕЖЕДНЕВНО:\n• Минимум 8 визитов торговых точек\n• Фотоотчёт с каждой точки (выкладка товара)\n• GPS-чекин при входе на точку\n\nПРИ ВИЗИТЕ:\n1. Проверить наличие продукции DELIS на полке\n2. Проверить сроки годности\n3. Поправить выкладку, разместить POS-материалы\n4. Уточнить остатки, предложить дозаказ\n5. Сфотографировать полку ПОСЛЕ выкладки\n6. Зафиксировать визит в CRM\n\nОТЧЁТНОСТЬ: до 19:00 все визиты должны быть в системе." },
    { title: "Скрипт продаж для новых клиентов", category: "sales", icon: "💬", views: 156, createdBy: "Азиза Мансурова", content: "ПРИВЕТСТВИЕ:\n«Здравствуйте! DELIS — производитель профессиональной химии для дома и авто. Работаем с 2019 года, поставляем более 200 точкам по Узбекистану.»\n\nВЫЯВЛЕНИЕ ПОТРЕБНОСТИ:\n• Какую химию используете сейчас?\n• Что не устраивает в текущем поставщике?\n• Какой объём закупаете в месяц?\n\nПРЕЗЕНТАЦИЯ:\n• Своё производство → цена ниже импорта на 30%\n• Доставка за 24 часа по Ташкенту\n• Отсрочка платежа для постоянных клиентов\n• Бесплатные образцы на пробу\n\nЗАКРЫТИЕ:\n«Давайте начнём с пробной партии — привезу завтра, оплата после реализации.»" },
    { title: "Настройка Telegram Bot", category: "tech", icon: "🤖", views: 43, createdBy: "Музаффар", content: "1. Откройте @BotFather в Telegram\n2. Отправьте команду /newbot\n3. Придумайте имя бота (например: DELIS Uzbekistan)\n4. Придумайте username (должен заканчиваться на _bot)\n5. Скопируйте полученный токен\n6. В CRM: Настройки → Интеграции → Telegram Bot\n7. Вставьте токен и нажмите «Проверить соединение»\n8. После успешной проверки включите переключатель" },
    { title: "Что делать при низком остатке", category: "warehouse", icon: "⚠️", views: 71, createdBy: "Улугбек Сотволдиев", content: "СИГНАЛ: товар подсвечен красным в разделе «Склад».\n\nДЕЙСТВИЯ:\n1. Раздел «Поставщики» → красная плашка сверху\n2. Нажмите «Заказать одним кликом» — система сама рассчитает количество\n3. Или создайте закупку вручную: выберите поставщика → добавьте позиции\n4. Проверьте срок поставки (у импорта из Китая — 35 дней!)\n5. Поставьте задачу на контроль в разделе «Задачи»\n\nПРАВИЛО: заказывать при остатке ниже 3-недельного запаса." },
    { title: "Права доступа сотрудников (RBAC)", category: "tech", icon: "🔐", views: 38, createdBy: "Музаффар", content: "РОЛИ В СИСТЕМЕ:\n\n• Owner — полный доступ, создание аккаунтов\n• Admin — всё кроме удаления Owner\n• Manager — заказы, клиенты, товары, чат\n• Warehouse — склад, приход/расход, инвентаризация\n• Agent — свои визиты, заказы точек\n• Support — чат и клиенты\n• Moderator — контент сайта и Mini App\n• Operator — приём заказов\n\nСОЗДАНИЕ АККАУНТА:\nПользователи → «Создать аккаунт» → имя, @логин, роль, пароль.\nЛогин выдаёт только Owner или Admin." },
  ]);

  await db.insert(s.tasks).values([
    { title: "Обзвонить VIP-клиентов с акцией", description: "Предложить персональную скидку 25% по промокоду VIP2026", assignee: "Азиза Мансурова", priority: "high", status: "in_progress", linkType: "customer", linkLabel: "12 VIP-клиентов", dueAt: new Date(now + 86400000), createdBy: "Музаффар" },
    { title: "Проверить приход партии PO-1203", description: "Сверить накладную с фактическим количеством", assignee: "Улугбек Сотволдиев", priority: "high", status: "todo", linkType: "supplier", linkLabel: "Guangzhou ChemImport", dueAt: new Date(now + 2 * 86400000), createdBy: "Музаффар" },
    { title: "Подготовить отчёт по продажам за месяц", description: "Выгрузить Excel и отправить учредителям", assignee: "Музаффар", priority: "mid", status: "todo", linkType: "", linkLabel: "", dueAt: new Date(now + 3 * 86400000), createdBy: "Музаффар" },
    { title: "Обработать возврат по заказу DLS-24031", description: "Клиент жалуется на повреждённую упаковку", assignee: "Нигора Расулова", priority: "high", status: "todo", linkType: "order", linkLabel: "DLS-24031", dueAt: new Date(now + 86400000 / 2), createdBy: "Азиза Мансурова" },
    { title: "Согласовать маршрут агента в Самарканде", description: "Добавить 3 новые точки к маршруту", assignee: "Диёр Комилов", priority: "low", status: "in_progress", linkType: "agent", linkLabel: "Диёр Комилов", dueAt: new Date(now + 5 * 86400000), createdBy: "Музаффар" },
    { title: "Обновить баннеры в Mini App", description: "Загрузить новые акционные баннеры на главную", assignee: "Азиза Мансурова", priority: "mid", status: "done", linkType: "", linkLabel: "", dueAt: new Date(now - 86400000), createdBy: "Музаффар" },
    { title: "Пополнить склад: Glass Cleaner", description: "Остаток ниже минимума, заказать у поставщика", assignee: "Улугбек Сотволдиев", priority: "high", status: "done", linkType: "supplier", linkLabel: "Chemical Trade Group", dueAt: new Date(now - 2 * 86400000), createdBy: "Музаффар" },
  ]);

  await db.insert(s.promocodes).values([
    { code: "DELIS20", discountType: "percent", discountValue: "20", minOrderAmount: "150000", maxUses: 500, usedCount: 142, status: "active", validUntil: new Date(now + 14 * 86400000) },
    { code: "VIP2026", discountType: "percent", discountValue: "25", minOrderAmount: "300000", maxUses: 100, usedCount: 38, status: "active", validUntil: new Date(now + 30 * 86400000) },
    { code: "AUTO15", discountType: "fixed", discountValue: "50000", minOrderAmount: "250000", maxUses: 200, usedCount: 89, status: "active", validUntil: new Date(now + 10 * 86400000) },
    { code: "WELCOME10", discountType: "percent", discountValue: "10", minOrderAmount: "50000", maxUses: 1000, usedCount: 412, status: "active", validUntil: new Date(now + 60 * 86400000) },
  ]);

  const supplierRows = await db.insert(s.suppliers).values([
    { name: "Chemical Trade Group", contactPerson: "Алишер Рахимов", phone: "+998 71 234-56-78", email: "sales@chemtrade.uz", city: "Tashkent", address: "ул. Промышленная, 42", inn: "301889224", category: "raw_materials", rating: 5, leadTimeDays: 5, totalPurchased: "284000000", notes: "Основной поставщик сырья. Отсрочка платежа 14 дней." },
    { name: "PackPro Uzbekistan", contactPerson: "Дилшод Каримов", phone: "+998 90 111-22-33", email: "info@packpro.uz", city: "Tashkent", address: "Сергелийский р-н, склад 7", inn: "302445610", category: "packaging", rating: 4, leadTimeDays: 10, totalPurchased: "96500000", notes: "Флаконы, канистры, крышки, этикетки." },
    { name: "Guangzhou ChemImport", contactPerson: "Li Wei", phone: "+86 20 8888 1234", email: "export@gzchem.cn", country: "China", city: "Guangzhou", address: "Baiyun District, Blk 12", inn: "CN-91440101", category: "raw_materials", rating: 4, leadTimeDays: 35, totalPurchased: "412000000", notes: "Импорт ПАВ и концентратов. Морская доставка 30-40 дней." },
    { name: "Tashkent Label Print", contactPerson: "Нодира Юсупова", phone: "+998 93 456-78-90", email: "order@tlp.uz", city: "Tashkent", address: "ул. Навои, 15", inn: "303112998", category: "packaging", rating: 5, leadTimeDays: 4, totalPurchased: "38200000", notes: "Печать этикеток и упаковки, срочные заказы." },
    { name: "AutoChem Supply", contactPerson: "Бахтиёр Умаров", phone: "+998 95 777-88-99", email: "b.umarov@autochem.uz", city: "Samarkand", address: "Промзона, участок 3", inn: "304556123", category: "chemicals", rating: 3, leadTimeDays: 14, totalPurchased: "67400000", notes: "Автохимия, воски. Иногда задерживает поставки." },
  ]).returning();

  const poRows: { number: string; supplierId: number; status: string; total: string; paid: string; expectedAt: Date | null; receivedAt: Date | null; notes: string; createdBy: string; createdAt: Date }[] = [];
  const poStatuses = ["received", "shipped", "confirmed", "sent", "draft", "received"];
  for (let i = 0; i < 6; i++) {
    const sup = supplierRows[i % supplierRows.length];
    const st = poStatuses[i];
    const created = new Date(now - (i * 6 + 2) * 86400000);
    const total = 12_000_000 + rnd(60) * 1_000_000;
    poRows.push({
      number: `PO-${1200 + i}`,
      supplierId: sup.id,
      status: st,
      total: String(total),
      paid: st === "received" ? String(total) : st === "shipped" ? String(Math.round(total / 2)) : "0",
      expectedAt: new Date(created.getTime() + sup.leadTimeDays * 86400000),
      receivedAt: st === "received" ? new Date(created.getTime() + sup.leadTimeDays * 86400000) : null,
      notes: ["Плановая закупка сырья", "Пополнение тары", "Импортная партия концентратов", "Этикетки на новую линейку", "Автохимия к сезону", "Регулярная поставка"][i],
      createdBy: "Музаффар",
      createdAt: created,
    });
  }
  const insertedPOs = await db.insert(s.purchaseOrders).values(poRows).returning();

  for (const po of insertedPOs) {
    const itemsCount = 2 + rnd(3);
    const items = Array.from({ length: itemsCount }, () => {
      const p = prods[rnd(prods.length)];
      const qty = 50 + rnd(400);
      return { purchaseOrderId: po.id, productId: p.id, name: p.name, qty, price: p.cost };
    });
    await db.insert(s.purchaseItems).values(items);
  }

  await db.insert(s.marketingTriggers).values([
    { title: "Брошенная корзина (через 2 часа)", eventKey: "abandoned_cart", actionType: "discount_message", messageBody: "💜 Вы забыли товары в корзине DELIS! Дарим скидку 10% по коду WELCOME10 при оформлении сегодня.", discountBonus: 10, isActive: true, triggeredCount: 184 },
    { title: "Спящий клиент (30 дней без покупок)", eventKey: "sleeping_customer", actionType: "discount_message", messageBody: "✨ Скучаем по вам! Специальный промокод DELIS20 на скидку 20% на всю автохимию.", discountBonus: 20, isActive: true, triggeredCount: 96 },
    { title: "Достижение статуса VIP", eventKey: "vip_threshold", actionType: "bonus_points", messageBody: "🎉 Поздравляем! Вы стали VIP-клиентом DELIS. Вам начислено 50 000 бонусных баллов и постоянная скидка 15%.", discountBonus: 50000, isActive: true, triggeredCount: 24 },
    { title: "День рождения клиента", eventKey: "birthday", actionType: "discount_message", messageBody: "🎂 С Днём рождения от команды DELIS! Дарим вам персональный подарок к заказу и бесплатную доставку.", discountBonus: 15, isActive: true, triggeredCount: 41 },
  ]);
}

export function ensureSeed() {
  if (!seeded) {
    seeded = run().catch((e) => {
      seeded = null;
      throw e;
    });
  }
  return seeded;
}
