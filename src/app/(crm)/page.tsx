import { getCompanyOS, getDashboard } from "@/server/queries";
import { StatGrid } from "@/widgets/StatCard";
import { Card, Badge, Progress, Avatar } from "@/shared/ui/kit";
import { RevenueArea, Donut, Legend, Bars } from "@/shared/ui/charts";
import { money, compact, dt, statusMeta, SOURCE_LABEL, num, pctChange } from "@/shared/lib/format";
import Link from "next/link";
import { CompanyOS } from "@/widgets/CompanyOS";
import { LiveClock } from "@/widgets/LiveClock";
import { TasksToday } from "@/widgets/TasksToday";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (session?.role === "agent") {
    redirect("/agent-portal");
  }
  const [d, os] = await Promise.all([getDashboard(), getCompanyOS()]);
  const revenue = Number(d.totals.revenue);
  const profit = Number(d.totals.profit);
  const orders = Number(d.totals.orders);
  const customers = Number(d.counts.customers);
  const expenses = Number(d.counts.expenses);

  const stats = [
    { label: "Выручка", value: revenue, color: "#8b5cf6", icon: "💰", delta: pctChange(d.last30.revenue, d.prev30.revenue) },
    { label: "Прибыль", value: profit, color: "#22c55e", icon: "📈", delta: pctChange(d.last30.profit, d.prev30.profit) },
    { label: "Заказы", value: orders, color: "#3b82f6", icon: "🧾", delta: pctChange(d.last30.orders, d.prev30.orders), mode: "num" as const },
    { label: "Клиенты", value: customers, color: "#ec4899", icon: "👥", delta: pctChange(customers, d.customers30dAgo), mode: "num" as const },
    { label: "Расходы", value: expenses, color: "#f97316", icon: "💸", delta: pctChange(d.expenses30, d.prev30.expenses) },
    { label: "Остаток склада", value: Number(d.counts.stock), color: "#14b8a6", icon: "📦", mode: "num" as const },
  ];

  const secondary = [
    { label: "Средний чек", value: money(d.totals.avg) },
    { label: "Конверсия", value: `${((Number(d.totals.delivered) / Math.max(orders, 1)) * 100).toFixed(1)}%` },
    { label: "LTV клиента", value: money(revenue / Math.max(customers, 1)) },
    { label: "Возвраты", value: `${d.totals.returned} шт` },
    { label: "Маржа", value: `${((profit / Math.max(revenue, 1)) * 100).toFixed(1)}%` },
    { label: "Агенты", value: `${d.counts.agents} активны` },
  ];

  const chart = d.byDay.map((r) => ({ day: r.day, revenue: Number(r.revenue), profit: Number(r.profit) }));
  const channels = d.byChannel.map((c) => ({ name: SOURCE_LABEL[c.name] ?? c.name, value: Number(c.value) }));
  const statuses = d.byStatus.map((c) => ({ name: statusMeta(c.name).label, value: Number(c.value) }));

  return (
    <>
      <LiveClock name={session?.name ?? "Отабек"} />

      <div className="grid gap-[var(--gap)] md:grid-cols-4">
        {[
          {
            label: "Заказов сегодня",
            today: Number(d.todayVs.todayOrders),
            yesterday: Number(d.todayVs.yesterdayOrders),
            color: "#3b82f6",
            suffix: "",
          },
          {
            label: "Выручка сегодня",
            today: Number(d.todayVs.todayRevenue),
            yesterday: Number(d.todayVs.yesterdayRevenue),
            color: "#22c55e",
            suffix: "сум",
          },
          {
            label: "Средний чек",
            today: Number(d.todayVs.todayAvg),
            yesterday: Number(d.todayVs.yesterdayAvg),
            color: "#8b5cf6",
            suffix: "сум",
          },
          {
            label: "Отмен",
            today: Number(d.todayVs.todayCancelled),
            yesterday: Number(d.todayVs.yesterdayCancelled),
            color: "#ef4444",
            suffix: "",
          },
        ].map((kpi) => {
          const delta = pctChange(kpi.today, kpi.yesterday);
          const up = (delta ?? 0) >= 0;
          return (
            <Card key={kpi.label} delay={0}>
              <div className="text-[0.72rem] uppercase tracking-wider muted">{kpi.label}</div>
              <div className="text-xl font-semibold mt-2" style={{ color: kpi.color }}>
                {num(kpi.today)} {kpi.suffix && <span className="text-xs muted">{kpi.suffix}</span>}
              </div>
              {delta !== null && (
                <div className="flex items-center gap-1 mt-1.5 text-xs font-medium" style={{ color: up ? "var(--success)" : "var(--error)" }}>
                  {up ? "↑" : "↓"} {up ? "+" : ""}{delta}% <span className="muted font-normal">vs вчера</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <CompanyOS
        modules={os.modules}
        sync={os.sync.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          entity: e.entity,
          action: e.action,
          status: e.status,
          payload: e.payload,
          createdAt: String(e.createdAt),
        }))}
      />

      <StatGrid stats={stats} />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Выручка и прибыль</h3>
              <p className="muted text-xs mt-0.5">Динамика за последние 30 дней</p>
            </div>
            {(() => {
              const mom = pctChange(d.last30.revenue, d.prev30.revenue);
              return mom === null ? null : (
                <Badge color={mom >= 0 ? "#22c55e" : "#ef4444"}>
                  {mom >= 0 ? "+" : ""}{mom}% MoM
                </Badge>
              );
            })()}
          </div>
          <RevenueArea data={chart} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {secondary.map((s) => (
              <div key={s.label} className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                <div className="text-[0.7rem] muted uppercase tracking-wider">{s.label}</div>
                <div className="text-sm font-semibold mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-1">Источники заказов</h3>
          <p className="muted text-xs mb-2">Telegram · Mini App · Сайт · Instagram · Агенты</p>
          <Donut data={channels} />
          <Legend data={channels} />
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2 !p-0">
          <div className="flex items-center justify-between card-pad pb-3">
            <h3 className="font-semibold">Последние заказы</h3>
            <Link href="/orders" className="btn">
              Открыть все
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Клиент</th>
                  <th>Канал</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {d.recentOrders.map((o) => {
                  const st = statusMeta(o.status);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/orders/${o.id}`} className="font-semibold">
                          {o.number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">{o.customer}</td>
                      <td className="muted">{SOURCE_LABEL[o.channel] ?? o.channel}</td>
                      <td className="font-semibold">{money(o.total)}</td>
                      <td>
                        <Badge color={st.color}>{st.label}</Badge>
                      </td>
                      <td className="muted whitespace-nowrap">{dt(o.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Активность команды</h3>
          <div className="flex flex-col gap-3">
            {d.acts.map((a) => (
              <div key={a.id} className="flex gap-3 items-start">
                <Avatar name={a.actor} color="var(--accent)" size={32} />
                <div className="min-w-0">
                  <div className="text-[0.82rem]">
                    <span className="font-semibold">{a.actor}</span> <span className="muted">{a.action}</span>
                  </div>
                  <div className="text-xs muted truncate">
                    {a.entity} · {dt(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="h-px my-4" style={{ background: "rgba(var(--border))" }} />
          <h3 className="font-semibold mb-3">Новые клиенты</h3>
          <div className="flex flex-col gap-2.5">
            {d.recentCustomers.map((c) => (
              <Link href={`/customers/${c.id}`} key={c.id} className="flex items-center gap-3">
                <Avatar name={`${c.firstName} ${c.lastName}`} color="#ec4899" size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[0.82rem] font-medium truncate">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs muted truncate">
                    @{c.username} · {SOURCE_LABEL[c.source] ?? c.source}
                  </div>
                </div>
                {c.isVip && <Badge color="#f59e0b">VIP</Badge>}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card>
          <h3 className="font-semibold mb-1">Популярные товары</h3>
          <p className="muted text-xs mb-3">Топ по продажам</p>
          <div className="flex flex-col gap-3">
            {d.topProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                  {p.image}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.82rem] font-medium truncate">{p.name}</div>
                  <div className="text-xs muted">
                    {num(p.sold)} продаж · {money(p.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-1">Склад: низкие остатки</h3>
          <p className="muted text-xs mb-3">{d.counts.lowStock} позиций требуют закупки</p>
          <div className="flex flex-col gap-3.5">
            {d.lowStock.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-[0.8rem] mb-1.5">
                  <span className="truncate pr-2">{p.name}</span>
                  <span className="font-semibold" style={{ color: p.stock < p.lowStock ? "var(--error)" : "var(--warning)" }}>
                    {p.stock} шт
                  </span>
                </div>
                <Progress value={(p.stock / Math.max(p.lowStock * 3, 1)) * 100} color={p.stock < p.lowStock ? "#ef4444" : "#f97316"} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-1">Статусы заказов</h3>
          <p className="muted text-xs mb-3">Распределение по воронке</p>
          <Bars data={statuses} height={220} />
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Активность агентов</h3>
            <Link href="/agents" className="btn">
              CRM агентов
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {d.agents.map((a) => {
              const pct = (Number(a.fact) / Math.max(Number(a.plan), 1)) * 100;
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <Avatar name={a.name} color={a.avatarColor} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[0.82rem] mb-1.5">
                      <span className="font-medium truncate">{a.name}</span>
                      <span className="muted">
                        {compact(a.fact)} / {compact(a.plan)}
                      </span>
                    </div>
                    <Progress value={pct} color={pct >= 100 ? "#22c55e" : a.avatarColor} />
                  </div>
                  <Badge color={pct >= 100 ? "#22c55e" : "#f97316"}>{pct.toFixed(0)}%</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Последние сообщения</h3>
            <Link href="/chat" className="btn">
              Открыть чат
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {d.recentMessages.map((m) => (
              <div key={m.id} className="flex gap-3 items-start">
                <Avatar name={m.customer} color={m.fromAdmin ? "var(--primary)" : "#3b82f6"} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-[0.82rem] font-medium truncate">{m.fromAdmin ? "Вы → " + m.customer : m.customer}</span>
                    <span className="text-xs muted whitespace-nowrap">{dt(m.createdAt)}</span>
                  </div>
                  <div className="text-xs muted truncate">{m.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-2">
        <TasksToday />
        <Card hover={false}>
          <h3 className="font-semibold mb-3">✅ Что уже реализовано</h3>
          <div className="flex flex-col gap-2">
            {[
              { icon: "🤖", title: "Telegram Bot API", desc: "Статусы заказов уходят клиенту в Telegram", color: "#0ea5e9" },
              { icon: "📊", title: "Excel/PDF отчёты", desc: "Экспорт заказов, агентов, финансов и печатные формы", color: "#22c55e" },
              { icon: "🔔", title: "Live-уведомления (SSE)", desc: "Мгновенные алерты без обновления страницы", color: "#f97316" },
              { icon: "🗺️", title: "GPS-карта агентов", desc: "Маршруты и визиты на интерактивной карте", color: "#8b5cf6" },
              { icon: "📱", title: "PWA для телефона", desc: "Установка CRM на главный экран", color: "#3b82f6" },
              { icon: "🔐", title: "2FA авторизация", desc: "Двухфакторная защита для Owner/Admin", color: "#ec4899" },
            ].map((r) => (
              <div key={r.title} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
                <span className="text-xl shrink-0">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.83rem] font-semibold" style={{ color: r.color }}>{r.title}</div>
                  <div className="text-xs muted truncate">{r.desc}</div>
                </div>
                <span className="text-[0.7rem] font-semibold shrink-0" style={{ color: "var(--success)" }}>Готово</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
