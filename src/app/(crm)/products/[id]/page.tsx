import { getProduct } from "@/server/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Badge, Progress } from "@/shared/ui/kit";
import { money, num, dt, statusMeta } from "@/shared/lib/format";
import { ProductActions } from "./ProductActions";
import { ProductGallery } from "@/shared/ui/ProductThumb";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProduct(Number(id));
  if (!data) notFound();
  const { product: p, category, recentOrders } = data;
  const margin = ((Number(p.price) - Number(p.cost)) / Math.max(Number(p.price), 1)) * 100;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/products" className="btn">← Товары</Link>
          <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
          {p.isNew && <Badge color="#3b82f6">NEW</Badge>}
          {p.isPopular && <Badge color="#8b5cf6">HIT</Badge>}
          {p.status !== "active" && <Badge color="#ef4444">{p.status}</Badge>}
        </div>
        <ProductActions id={p.id} />
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-start gap-5">
            <ProductGallery images={p.images?.length ? p.images : [p.image]} name={p.name} />
            <div className="flex-1 min-w-0">
              <div className="text-xl font-semibold">{p.name}</div>
              <div className="muted text-sm mt-1">{p.description || "Профессиональное средство от DELIS"}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge color="var(--primary)">SKU: {p.sku}</Badge>
                <Badge color="var(--accent)">Barcode: {p.barcode || "—"}</Badge>
                <Badge color="#22c55e">{p.brand}</Badge>
                <Badge color="#14b8a6">{p.country}</Badge>
                <Badge color="#ec4899">{p.volume}</Badge>
                <Badge color="#f97316">{category}</Badge>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              ["Цена", money(p.price), "var(--primary)"],
              ["Себестоимость", money(p.cost), "var(--muted)"],
              ["Маржа", `${margin.toFixed(0)}%`, "var(--success)"],
              ["НДС", `${p.vat}%`, "var(--accent)"],
              ["Вес", `${p.weight} кг`, "#f97316"],
              ["Объём", p.volume, "#8b5cf6"],
              ["Скидка", `${p.discount}%`, "#ef4444"],
              ["Цвет", p.color, p.color],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                <div className="text-xs muted uppercase tracking-wider">{label}</div>
                <div className="text-sm font-semibold mt-1" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-[var(--gap)]">
          <Card>
            <h3 className="font-semibold mb-3">Склад</h3>
            <div className="flex justify-between text-sm mb-1.5">
              <span>Остаток</span>
              <span className="font-semibold" style={{ color: p.stock < p.lowStock ? "var(--error)" : "var(--success)" }}>
                {p.stock} шт
              </span>
            </div>
            <Progress value={(p.stock / Math.max(p.lowStock * 4, 1)) * 100} color={p.stock < p.lowStock ? "#ef4444" : "#22c55e"} />
            <div className="flex justify-between text-xs muted mt-2">
              <span>Мин. остаток: {p.lowStock}</span>
              <span>Продано: {num(p.sold)}</span>
            </div>
            {p.stock < p.lowStock && (
              <div className="mt-3 rounded-2xl p-3 text-xs" style={{ background: "color-mix(in srgb, var(--error) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)" }}>
                ⚠️ Низкий остаток — рекомендуется закупка
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold mb-3">Флаги</h3>
            <div className="flex flex-wrap gap-2">
              {[
                ["Популярный", p.isPopular, "#8b5cf6"],
                ["Новинка", p.isNew, "#3b82f6"],
                ["Рекомендуемый", p.isFeatured, "#22c55e"],
              ].map(([label, active, color]) => (
                <Badge key={String(label)} color={active ? String(color) : "#666"}>
                  {active ? "✓" : "✗"} {String(label)}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card hover={false} className="!p-0">
        <div className="card-pad pb-2 flex items-center justify-between">
          <h3 className="font-semibold">Последние заказы с этим товаром</h3>
          <Link href="/orders" className="btn">Все заказы</Link>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Клиент</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o: { id: number; number: string; status: string; total: string; qty: number; createdAt: Date; customer: string }) => {
                const st = statusMeta(o.status);
                return (
                  <tr key={o.id}>
                    <td><Link href={`/orders/${o.id}`} className="font-semibold">{o.number}</Link></td>
                    <td>{o.customer}</td>
                    <td>{o.qty}</td>
                    <td className="font-semibold">{money(o.total)}</td>
                    <td><Badge color={st.color}>{st.label}</Badge></td>
                    <td className="muted">{dt(o.createdAt)}</td>
                  </tr>
                );
              })}
              {recentOrders.length === 0 && <tr><td colSpan={6} className="muted">Нет заказов с этим товаром</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
