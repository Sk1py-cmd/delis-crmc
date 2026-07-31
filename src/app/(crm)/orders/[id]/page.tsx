import { getOrder } from "@/server/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Badge, Avatar } from "@/shared/ui/kit";
import { money, dt, statusMeta, ORDER_STATUSES, SOURCE_LABEL } from "@/shared/lib/format";
import { OrderActions } from "./OrderActions";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOrder(Number(id));
  if (!data) notFound();
  const { order, items, customer } = data;
  const st = statusMeta(order.status);
  const subtotal = items.reduce((a, i) => a + Number(i.price) * i.qty, 0);
  const vat = Math.round(subtotal * 0.12);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="btn">
            ← Заказы
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{order.number}</h1>
          <Badge color={st.color}>{st.label}</Badge>
        </div>
        <OrderActions id={order.id} status={order.status} statuses={ORDER_STATUSES} />
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2" id="invoice">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xl font-semibold grad-text">DELIS</div>
              <div className="muted text-xs mt-1">ООО «DELIS CHEMICALS» · Ташкент, Узбекистан</div>
              <div className="muted text-xs">ИНН 302 456 789 · +998 71 200-70-70</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">Invoice {order.number}</div>
              <div className="muted text-xs">{dt(order.createdAt)}</div>
              <div className="muted text-xs">Оплата: {order.payment.toUpperCase()}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Кол-во</th>
                  <th>Цена</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{i.qty}</td>
                    <td>{money(i.price)}</td>
                    <td className="font-semibold">{money(Number(i.price) * i.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-5">
            <div className="w-full max-w-xs flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="muted">Подытог</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">НДС 12%</span>
                <span>{money(vat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Прибыль</span>
                <span style={{ color: "var(--success)" }}>{money(order.profit)}</span>
              </div>
              <div className="h-px" style={{ background: "rgba(var(--border))" }} />
              <div className="flex justify-between text-lg font-semibold">
                <span>Итого</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 pt-5" style={{ borderTop: "1px solid rgba(var(--border))" }}>
            <div
              className="w-20 h-20 rounded-xl grid grid-cols-5 gap-[2px] p-1.5"
              style={{ background: "#fff" }}
              aria-label="QR оплаты"
            >
              {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} style={{ background: (i * 7 + order.id) % 3 === 0 ? "#000" : "transparent", borderRadius: 1 }} />
              ))}
            </div>
            <div className="text-xs muted">
              QR для оплаты через Click / Payme / Uzum.
              <br />
              Штрихкод: <span className="font-mono">{`*${order.number}*`}</span>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-[var(--gap)]">
          <Card>
            <h3 className="font-semibold mb-3">Клиент</h3>
            {customer && (
              <Link href={`/customers/${customer.id}`} className="flex items-center gap-3">
                <Avatar name={`${customer.firstName} ${customer.lastName}`} color="var(--primary)" size={44} />
                <div className="min-w-0">
                  <div className="font-medium">
                    {customer.firstName} {customer.lastName} {customer.isVip && <Badge color="#f59e0b">VIP</Badge>}
                  </div>
                  <div className="text-xs muted">
                    @{customer.username} · {customer.phone}
                  </div>
                  <div className="text-xs muted">
                    {customer.city}, {customer.address}
                  </div>
                </div>
              </Link>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
                <div className="muted">Канал</div>
                <div className="font-semibold mt-1">{SOURCE_LABEL[order.channel] ?? order.channel}</div>
              </div>
              <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
                <div className="muted">Оплата</div>
                <div className="font-semibold mt-1 capitalize">{order.payment}</div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">Таймлайн заказа</h3>
            <div className="flex flex-col gap-4">
              {[...order.timeline, { status: order.status, at: new Date(order.createdAt).toISOString(), by: "CRM" }]
                .filter((v, i, arr) => arr.findIndex((x) => x.status === v.status) === i)
                .map((t, i) => {
                  const m = statusMeta(t.status);
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                        <span className="flex-1 w-px" style={{ background: "rgba(var(--border))" }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: m.color }}>
                          {m.label}
                        </div>
                        <div className="text-xs muted">
                          {dt(t.at)} · {t.by}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
