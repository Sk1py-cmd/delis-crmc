import { getCustomer } from "@/server/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Badge, Avatar, Progress } from "@/shared/ui/kit";
import { money, dt, statusMeta, SOURCE_LABEL, dateOnly } from "@/shared/lib/format";
import { NoteSaver } from "./NoteSaver";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCustomer(Number(id));
  if (!data) notFound();
  const { customer: c, orders, msgs } = data;
  const total = orders.reduce((a, o) => a + Number(o.total), 0);
  const avg = total / Math.max(orders.length, 1);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/customers" className="btn">
          ← Клиенты
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {c.firstName} {c.lastName}
        </h1>
        {c.isVip && <Badge color="#f59e0b">VIP</Badge>}
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={`${c.firstName} ${c.lastName}`} color={c.isVip ? "#f59e0b" : "var(--primary)"} size={64} />
            <div className="min-w-0">
              <div className="font-semibold text-lg">
                {c.firstName} {c.lastName}
              </div>
              <div className="text-xs muted">@{c.username}</div>
              <div className="text-xs muted">Telegram ID: {c.telegramId}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-5 text-sm">
            {[
              ["Телефон", c.phone],
              ["Email", c.email],
              ["Город", `${c.city}, ${c.region}`],
              ["Адрес", c.address],
              ["Язык", c.language.toUpperCase()],
              ["Источник", SOURCE_LABEL[c.source] ?? c.source],
              ["Регистрация", dateOnly(c.createdAt)],
              ["Последняя активность", dt(c.lastActiveAt)],
              ["Бонусы", `${c.bonus} баллов`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="muted">{k}</span>
                <span className="text-right truncate">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {c.tags.map((t) => (
              <Badge key={t} color="var(--accent)">
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <Link href={`/chat?customer=${c.id}`} className="btn btn-primary flex-1 justify-center">
              Написать в чат
            </Link>
            <Link href="/orders/new" className="btn">
              Заказ
            </Link>
          </div>
        </Card>

        <div className="xl:col-span-2 flex flex-col gap-[var(--gap)]">
          <div className="grid sm:grid-cols-3 gap-[var(--gap)]">
            {[
              ["Заказов", String(orders.length), "#3b82f6"],
              ["Сумма покупок", money(total), "#22c55e"],
              ["Средний чек", money(avg), "#8b5cf6"],
            ].map(([label, value, color]) => (
              <Card key={label}>
                <div className="text-xs muted uppercase tracking-wider">{label}</div>
                <div className="text-xl font-semibold mt-2" style={{ color }}>
                  {value}
                </div>
              </Card>
            ))}
          </div>

          <Card hover={false} className="!p-0">
            <h3 className="font-semibold card-pad pb-2">История заказов</h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Канал</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const st = statusMeta(o.status);
                    return (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/orders/${o.id}`} className="font-semibold">
                            {o.number}
                          </Link>
                        </td>
                        <td>{money(o.total)}</td>
                        <td>
                          <Badge color={st.color}>{st.label}</Badge>
                        </td>
                        <td className="muted">{SOURCE_LABEL[o.channel] ?? o.channel}</td>
                        <td className="muted">{dt(o.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Заказов пока нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-[var(--gap)]">
            <Card>
              <h3 className="font-semibold mb-3">История сообщений</h3>
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
                {msgs.map((m) => (
                  <div key={m.id} className="text-sm">
                    <div className="flex justify-between text-xs muted mb-0.5">
                      <span>{m.fromAdmin ? "Менеджер DELIS" : c.firstName}</span>
                      <span>{dt(m.createdAt)}</span>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-2"
                      style={{ background: m.fromAdmin ? "linear-gradient(120deg,var(--primary),var(--accent))" : "rgba(var(--table-row))", color: m.fromAdmin ? "#fff" : "var(--text)" }}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
                {msgs.length === 0 && <div className="muted text-sm">Переписки пока нет</div>}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Заметки менеджеров</h3>
              <NoteSaver id={c.id} initial={c.notes} />
              <div className="mt-5">
                <div className="text-xs muted mb-2">Прогресс до статуса VIP</div>
                <Progress value={Math.min(100, (total / 5_000_000) * 100)} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
