import { getCompanyOS, getDashboard, recentOrdersList, getProducts, getCustomers, getFinance } from "@/server/queries";
import { CompanyOS } from "@/widgets/CompanyOS";
import { Card, PageHeader, Badge, Avatar, Progress } from "@/shared/ui/kit";
import { money, dt, statusMeta, SOURCE_LABEL, num } from "@/shared/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CompanyOSPage() {
  const [os, dash, orders, products, customers, finance] = await Promise.all([
    getCompanyOS(),
    getDashboard(),
    recentOrdersList(8),
    getProducts(),
    getCustomers(),
    getFinance(),
  ]);

  const low = products.filter((p) => p.stock < p.lowStock).slice(0, 5);
  const vip = customers.filter((c) => c.isVip).slice(0, 5);
  const profit = Number(finance.agg.income) - Number(finance.agg.expense);

  return (
    <>
      <PageHeader
        title="DELIS Company OS"
        subtitle="Одна операционная система для всей компании: продажи, склад, финансы, клиенты, каналы и аналитика"
        actions={
          <>
            <Link href="/orders/new" className="btn">Новый заказ</Link>
            <Link href="/broadcast" className="btn btn-primary">Рассылка</Link>
          </>
        }
      />

      <CompanyOS
        modules={os.modules}
        sync={os.sync.map((e) => ({ id: e.id, source: e.source, target: e.target, entity: e.entity, action: e.action, status: e.status, payload: e.payload, createdAt: String(e.createdAt) }))}
      />

      <div className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Открытые заказы", os.counts.openOrders, "#3b82f6", "/orders"],
          ["Клиенты", os.counts.customers, "#8b5cf6", "/customers"],
          ["Низкие остатки", os.counts.lowStock, "#f97316", "/warehouse"],
          ["Прибыль", profit, "#22c55e", "/finance"],
        ].map(([label, value, color, href]) => (
          <Link key={String(label)} href={String(href)} className="glass card-pad block">
            <div className="text-xs muted uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-semibold mt-2" style={{ color: String(color) }}>
              {label === "Прибыль" ? money(Number(value)) : num(Number(value))}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card hover={false} className="!p-0 xl:col-span-2">
          <div className="card-pad pb-2 flex items-center justify-between">
            <h3 className="font-semibold">Операционная лента заказов</h3>
            <Link href="/orders" className="btn">Все заказы</Link>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Заказ</th>
                  <th>Клиент</th>
                  <th>Канал</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th className="hidden md:table-cell">Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const st = statusMeta(o.status);
                  return (
                    <tr key={o.id}>
                      <td><Link href={`/orders/${o.id}`} className="font-semibold">{o.number}</Link></td>
                      <td>{o.customer}</td>
                      <td className="muted">{SOURCE_LABEL[o.channel] ?? o.channel}</td>
                      <td className="font-semibold">{money(o.total)}</td>
                      <td><Badge color={st.color}>{st.label}</Badge></td>
                      <td className="muted hidden md:table-cell">{dt(o.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">VIP и ключевые клиенты</h3>
          <div className="flex flex-col gap-3">
            {vip.map((c) => (
              <Link href={`/customers/${c.id}`} key={c.id} className="flex items-center gap-3">
                <Avatar name={`${c.firstName} ${c.lastName}`} color="#f59e0b" size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.firstName} {c.lastName}</div>
                  <div className="text-xs muted">{c.ordersCount} заказов · {money(c.totalSpent)}</div>
                </div>
                <Badge color="#f59e0b">VIP</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card>
          <h3 className="font-semibold mb-3">Складовые риски</h3>
          <div className="flex flex-col gap-3">
            {low.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-[0.8rem] mb-1.5">
                  <span className="truncate pr-2">{p.image} {p.name}</span>
                  <span style={{ color: "var(--error)" }}>{p.stock} шт</span>
                </div>
                <Progress value={(p.stock / Math.max(p.lowStock * 3, 1)) * 100} color="#ef4444" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Финансовый контур</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
              <div className="text-xs muted">Доход</div>
              <div className="font-semibold mt-1" style={{ color: "var(--success)" }}>{money(finance.agg.income)}</div>
            </div>
            <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
              <div className="text-xs muted">Расход</div>
              <div className="font-semibold mt-1" style={{ color: "var(--error)" }}>{money(finance.agg.expense)}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs muted mb-1.5">
              <span>Маржа</span>
              <span>{((Number(dash.totals.profit) / Math.max(Number(dash.totals.revenue), 1)) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(Number(dash.totals.profit) / Math.max(Number(dash.totals.revenue), 1)) * 100} color="#22c55e" />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Единые правила синхронизации</h3>
          <div className="flex flex-col gap-2 text-sm">
            {[
              "Статус заказа → Telegram Bot + Mini App",
              "Остаток товара → сайт + Mini App",
              "Новый клиент → CRM + аналитика",
              "Оплата → финансы + заказ",
              "Контент → сайт + маркетинг",
            ].map((x) => (
              <div key={x} className="flex gap-2 items-start">
                <span className="mt-1 w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
                <span className="muted">{x}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
