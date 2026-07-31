"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Send, CheckCircle2 } from "lucide-react";
import { Card, PageHeader, Badge, Avatar, Modal } from "@/shared/ui/kit";
import { money, num } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { useT } from "@/shared/i18n/useT";
import { useLocale } from "@/shared/store/locale";

interface C { id: number; name: string; city: string; phone: string; isVip: boolean }
interface P { id: number; name: string; price: number; cost: number; stock: number; image: string; volume: string }

interface CartItem { product: P; qty: number }

export function NewOrderForm({ customers, products }: { customers: C[]; products: P[] }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? 0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("click");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ id: number; number: string } | null>(null);
  const router = useRouter();
  const toast = useToast();
  const tr = useT();
  const { locale } = useLocale();

  const filtered = useMemo(
    () => products.filter((p) => search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.volume.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );

  const addToCart = (p: P) => {
    setCart((c) => {
      const existing = c.find((x) => x.product.id === p.id);
      if (existing) return c.map((x) => (x.product.id === p.id ? { ...x, qty: Math.min(x.qty + 1, p.stock) } : x));
      return [...c, { product: p, qty: 1 }];
    });
  };

  const updateQty = (id: number, qty: number) => {
    setCart((c) =>
      qty <= 0
        ? c.filter((x) => x.product.id !== id)
        : c.map((x) => (x.product.id === id ? { ...x, qty: Math.min(qty, x.product.stock) } : x)),
    );
  };

  const removeItem = (id: number) => setCart((c) => c.filter((x) => x.product.id !== id));

  const total = cart.reduce((a, it) => a + it.product.price * it.qty, 0);
  const profit = cart.reduce((a, it) => a + (it.product.price - it.product.cost) * it.qty, 0);
  const customer = customers.find((c) => c.id === customerId);

  const submit = async () => {
    if (cart.length === 0) {
      toast(tr("products.addProduct"), "err");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          payment,
          items: cart.map((it) => ({ productId: it.product.id, qty: it.qty })),
        }),
      });
      const data = (await res.json()) as { order?: { id: number; number: string }; error?: string };
      if (data.order) {
        setDone(data.order);
        toast(`Заказ ${data.order.number} создан — остатки обновлены`);
      } else {
        toast(data.error ?? "Ошибка создания заказа", "err");
      }
    } catch {
      toast("Ошибка сети", "err");
    }
    setSaving(false);
  };

  return (
    <>
      <PageHeader
        title={tr("orders.newOrder")}
        subtitle="Добавьте товары в корзину — остатки склада обновятся автоматически"
        actions={<Badge color="var(--primary)">{cart.length} товаров в корзине</Badge>}
      />

      <div className="grid gap-[var(--gap)] lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-[var(--gap)]">
          <Card hover={false}>
            <label className="text-xs muted uppercase tracking-wider">Способ оплаты</label>
            <div className="flex flex-wrap gap-2 mt-1.5 mb-4">
              {[
                { key: "cash", label: "💵 Наличные", color: "#f97316" },
                { key: "click", label: "🔵 Click", color: "#3b82f6" },
                { key: "payme", label: "🟢 Payme", color: "#22c55e" },
                { key: "uzum", label: "🟣 Uzum", color: "#8b5cf6" },
                { key: "bank", label: "🏦 Банк", color: "#14b8a6" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPayment(p.key)}
                  className="rounded-2xl px-3.5 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: payment === p.key ? `color-mix(in srgb, ${p.color} 22%, transparent)` : "rgba(var(--table-row))",
                    color: payment === p.key ? p.color : "var(--muted)",
                    border: `1.5px solid ${payment === p.key ? `color-mix(in srgb, ${p.color} 50%, transparent)` : "rgba(var(--border))"}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="text-xs muted uppercase tracking-wider">Клиент</label>
            <div className="grid md:grid-cols-2 gap-3 mt-1.5">
              <select className="input" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.city} · {c.phone}{c.isVip ? " ⭐" : ""}</option>
                ))}
              </select>
              <button className="btn justify-center" onClick={() => toast("Новый клиент будет создан при первом заказе из Telegram Mini App")}>
                + Новый клиент
              </button>
            </div>
          </Card>

          <Card hover={false}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Каталог товаров</h3>
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
                <input className="input !pl-8 !py-2" placeholder="Поиск…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {filtered.map((p) => {
                const inCart = cart.find((x) => x.product.id === p.id);
                return (
                  <motion.button
                    key={p.id}
                    layout
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addToCart(p)}
                    className="rounded-2xl p-3 text-left relative"
                    style={{
                      background: inCart ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "rgba(var(--table-row))",
                      border: `1px solid ${inCart ? "color-mix(in srgb, var(--primary) 40%, transparent)" : "rgba(var(--border))"}`,
                    }}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 chip !px-2" style={{ background: "var(--primary)", color: "#fff", borderColor: "transparent" }}>
                        ×{inCart.qty}
                      </span>
                    )}
                    <div className="text-2xl mb-1">{p.image}</div>
                    <div className="text-[0.82rem] font-medium line-clamp-1">{p.name}</div>
                    <div className="text-xs muted">{p.volume} · остаток {p.stock}</div>
                    <div className="text-sm font-semibold mt-1.5">{money(p.price)}</div>
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </div>

        <Card hover={false} className="self-start sticky top-[100px]">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={18} color="var(--primary)" />
            <h3 className="font-semibold">Корзина</h3>
          </div>

          <AnimatePresence initial={false}>
            {cart.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="muted text-sm text-center py-8">
                Нажмите на товары, чтобы добавить
              </motion.div>
            )}
            {cart.map((it) => (
              <motion.div
                key={it.product.id}
                layout
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: "1px solid rgba(var(--border))" }}
              >
                <span className="text-xl">{it.product.image}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.8rem] truncate">{it.product.name}</div>
                  <div className="text-xs muted">{money(it.product.price)} × {it.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn !px-2 !py-1" onClick={() => updateQty(it.product.id, it.qty - 1)}>
                    <Minus size={12} />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{it.qty}</span>
                  <button className="btn !px-2 !py-1" onClick={() => updateQty(it.product.id, it.qty + 1)}>
                    <Plus size={12} />
                  </button>
                  <button className="btn !px-2 !py-1" onClick={() => removeItem(it.product.id)}>
                    <Trash2 size={12} color="var(--error)" />
                  </button>
                </div>
                <span className="text-sm font-semibold w-20 text-right">{money(it.product.price * it.qty)}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {cart.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="muted">Итого</span>
                <span className="text-lg font-semibold">{money(total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="muted">Прибыль</span>
                <span style={{ color: "var(--success)" }}>{money(profit)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="muted">Позиций</span>
                <span>{cart.length} ({cart.reduce((a, x) => a + x.qty, 0)} шт)</span>
              </div>
            </motion.div>
          )}

          <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary w-full justify-center mt-5 !py-3" disabled={saving || cart.length === 0} onClick={submit}>
            {saving ? tr("common.saving") : `Создать заказ · ${money(total)}`}
          </motion.button>

          <div className="mt-3 chip w-full justify-center" style={{ color: "var(--success)", borderColor: "color-mix(in srgb, var(--success) 30%, transparent)" }}>
            ⚡ Синхронизация: склад → Telegram → Mini App → финансы
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {done && (
          <Modal open onClose={() => setDone(null)} title={tr("orders.newOrder")}>
            <div className="text-center py-4">
              <CheckCircle2 size={48} color="var(--success)" className="mx-auto mb-3" />
              <div className="text-xl font-semibold">{done.number}</div>
              <div className="muted text-sm mt-1">Заказ создан и синхронизирован со всеми системами</div>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="btn flex-1 justify-center" onClick={() => router.push(`/orders/${done.id}`)}>
                Открыть
              </button>
              <button className="btn flex-1 justify-center" onClick={() => window.open(`/print/orders/${done.id}/invoice?lang=${locale}`, "_blank")}>
                <Printer size={14} /> Счёт
              </button>
              <button className="btn flex-1 justify-center" onClick={() => window.open(`/print/orders/${done.id}/waybill?lang=${locale}`, "_blank")}>
                <Send size={14} /> Накладная
              </button>
            </div>
            <button className="btn btn-primary w-full justify-center mt-2" onClick={() => { setDone(null); setCart([]); }}>
              Новый заказ
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
