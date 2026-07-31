import { getAnalytics } from "@/server/queries";
import { Card, PageHeader, Badge, Progress, Avatar } from "@/shared/ui/kit";
import { StatGrid } from "@/widgets/StatCard";
import { RevenueArea, Bars, Donut, Legend } from "@/shared/ui/charts";
import { money, num, SOURCE_LABEL, statusMeta } from "@/shared/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const a = await getAnalytics();
  const revenue = Number(a.totals.revenue);
  const profit = Number(a.totals.profit);
  const orders = Number(a.totals.orders);
  const customers = Number(a.counts.customers);
  const expenses = Number(a.counts.expenses);
  const marketing = expenses * 0.18;

  const kpis = [
    { label: "ROI", value: ((profit / Math.max(expenses, 1)) * 100).toFixed(0) + "%", color: "#22c55e", hint: "Возврат инвестиций" },
    { label: "LTV", value: money(revenue / Math.max(customers, 1)), color: "#8b5cf6", hint: "Пожизненная ценность" },
    { label: "CAC", value: money(marketing / Math.max(customers, 1)), color: "#f97316", hint: "Стоимость привлечения" },
    { label: "ARPU", value: money(revenue / Math.max(customers, 1)), color: "#3b82f6", hint: "Доход на клиента" },
    { label: "Retention", value: "68.4%", color: "#14b8a6", hint: "Повторные покупки" },
    { label: "Конверсия", value: ((Number(a.totals.delivered) / Math.max(orders, 1)) * 100).toFixed(1) + "%", color: "#ec4899", hint: "Заказ → доставка" },
  ];

  return (
    <>
      <PageHeader title="Аналитика" subtitle="Сквозная аналитика продаж, маржинальности и каналов привлечения" />

      <StatGrid
        stats={[
          { label: "Выручка", value: revenue, color: "#8b5cf6", icon: "💰", delta: 18.4 },
          { label: "Маржа", value: (profit / Math.max(revenue, 1)) * 100, suffix: "%", color: "#22c55e", icon: "📈", mode: "num" },
          { label: "Заказы", value: orders, color: "#3b82f6", icon: "🧾", mode: "num", delta: 9.6 },
          { label: "Средний чек", value: Number(a.totals.avg), color: "#f97316", icon: "🧮" },
          { label: "Клиенты", value: customers, color: "#ec4899", icon: "👥", mode: "num", delta: 22.5 },
          { label: "Отмены", value: Number(a.totals.cancelled), color: "#ef4444", icon: "🚫", mode: "num" },
        ]}
      />

      <div className="grid gap-[var(--gap)] md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <Card key={k.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{k.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="text-[0.7rem] muted mt-1">{k.hint}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="font-semibold mb-3">Выручка и прибыль за 30 дней</h3>
        <RevenueArea data={a.byDay.map((d) => ({ day: d.day, revenue: Number(d.revenue), profit: Number(d.profit) }))} />
      </Card>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card>
          <h3 className="font-semibold mb-2">Источники клиентов</h3>
          <Donut data={a.bySource.map((s) => ({ name: SOURCE_LABEL[s.name] ?? s.name, value: Number(s.value) }))} />
          <Legend data={a.bySource.map((s) => ({ name: SOURCE_LABEL[s.name] ?? s.name, value: Number(s.value) }))} />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-3">Выручка по городам</h3>
          <Bars data={a.byCity.map((c) => ({ name: c.name, value: Number(c.value) }))} color="var(--accent)" />
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card>
          <h3 className="font-semibold mb-3">Топ товаров</h3>
          <div className="flex flex-col gap-3.5">
            {a.topProducts.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-[0.8rem] mb-1.5">
                  <span className="truncate pr-2">
                    {p.image} {p.name}
                  </span>
                  <span className="muted">{num(p.sold)}</span>
                </div>
                <Progress value={(p.sold / Math.max(...a.topProducts.map((x) => x.sold))) * 100} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Лучшие клиенты</h3>
          <div className="flex flex-col gap-3">
            {a.topCustomers.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <Avatar name={`${c.firstName} ${c.lastName}`} color={c.isVip ? "#f59e0b" : "var(--primary)"} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[0.83rem] font-medium truncate">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs muted">{c.ordersCount} заказов</div>
                </div>
                <span className="text-sm font-semibold">{money(c.totalSpent)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Воронка статусов</h3>
          <div className="flex flex-col gap-2.5">
            {a.byStatus.map((s) => {
              const m = statusMeta(s.name);
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <Badge color={m.color}>{m.label}</Badge>
                  <div className="flex-1">
                    <Progress value={(Number(s.value) / Math.max(...a.byStatus.map((x) => Number(x.value)))) * 100} color={m.color} />
                  </div>
                  <span className="text-xs muted w-8 text-right">{s.value}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
