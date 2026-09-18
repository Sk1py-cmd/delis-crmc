import { Activity, PackageCheck, ShoppingCart, Users } from "lucide-react";
import type { AgentControlSummary } from "@/server/agentControl";

function formatMoney(value: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(value)) + " so‘m";
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AgentControlOverview({ data }: { data: AgentControlSummary }) {
  const statCards = [
    { label: "Активных агентов сегодня", value: data.totals.activeAgents, icon: Users },
    { label: "Заказов сегодня", value: data.totals.todayOrders, icon: ShoppingCart },
    { label: "Продано единиц", value: data.totals.todayUnits, icon: PackageCheck },
    { label: "Продажи сегодня", value: formatMoney(data.totals.todaySales), icon: Activity },
  ];

  return (
    <section className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-3xl border p-4"
            style={{
              background: "rgba(var(--card), .72)",
              borderColor: "rgba(var(--border))",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.12em] muted">{label}</div>
              <Icon size={17} className="muted" />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div
          className="overflow-hidden rounded-3xl border"
          style={{ borderColor: "rgba(var(--border))" }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(var(--border))" }}>
            <div>
              <div className="font-semibold">Кто что сделал сегодня</div>
              <div className="text-xs muted">Заказы, проданные единицы, сумма и последняя активность</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-xs uppercase tracking-wider muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Агент</th>
                  <th className="px-3 py-3 text-right font-medium">Заказы</th>
                  <th className="px-3 py-3 text-right font-medium">Единицы</th>
                  <th className="px-3 py-3 text-right font-medium">Продажи</th>
                  <th className="px-4 py-3 text-right font-medium">Последний заказ</th>
                </tr>
              </thead>
              <tbody>
                {data.byAgent.map((agent) => (
                  <tr key={agent.id} className="border-t" style={{ borderColor: "rgba(var(--border))" }}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-xs muted">
                        {agent.region}{agent.route ? ` · ${agent.route}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{agent.orders}</td>
                    <td className="px-3 py-3 text-right">{agent.units}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatMoney(agent.sales)}</td>
                    <td className="px-4 py-3 text-right muted">{formatTime(agent.lastOrderAt)}</td>
                  </tr>
                ))}
                {data.byAgent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center muted">
                      Агентов пока нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="rounded-3xl border p-4"
            style={{ borderColor: "rgba(var(--border))" }}
          >
            <div className="font-semibold">Какие товары продали сегодня</div>
            <div className="mt-3 space-y-3">
              {data.topProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold" style={{ background: "rgba(var(--table-row))" }}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{product.name}</div>
                    <div className="text-xs muted">{product.units} dona</div>
                  </div>
                  <div className="text-right text-xs font-semibold">{formatMoney(product.revenue)}</div>
                </div>
              ))}
              {data.topProducts.length === 0 && (
                <div className="py-6 text-center text-sm muted">Сегодня продаж товаров пока нет</div>
              )}
            </div>
          </div>

          <div
            className="rounded-3xl border p-4"
            style={{ borderColor: "rgba(var(--border))" }}
          >
            <div className="font-semibold">Последние заказы агентов</div>
            <div className="mt-3 space-y-2">
              {data.recentOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2" style={{ background: "rgba(var(--table-row))" }}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{order.number}</div>
                    <div className="truncate text-xs muted">{order.agentName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatMoney(order.total)}</div>
                    <div className="text-xs muted">{formatTime(order.createdAt)}</div>
                  </div>
                </div>
              ))}
              {data.recentOrders.length === 0 && (
                <div className="py-6 text-center text-sm muted">Заказов агентов пока нет</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
