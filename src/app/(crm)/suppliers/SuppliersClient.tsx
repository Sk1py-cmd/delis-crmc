"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Truck,
  Plus,
  Star,
  PackageCheck,
  Clock,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  ShoppingBag,
  Download,
  Trash2,
} from "lucide-react";
import { Card, PageHeader, Badge, Tabs, Modal, Progress, Avatar } from "@/shared/ui/kit";
import { money, compact, dt, dateOnly, num } from "@/shared/lib/format";
import { useNow } from "@/shared/lib/useNow";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { exportXLSX } from "@/shared/lib/excel";
import { useT } from "@/shared/i18n/useT";

export interface SupplierLite {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  category: string;
  rating: number;
  leadTimeDays: number;
  totalPurchased: string;
  status: string;
  notes: string;
}

export interface PurchaseLite {
  id: number;
  number: string;
  supplierId: number;
  supplierName: string | null;
  status: string;
  total: string;
  paid: string;
  expectedAt: string | null;
  receivedAt: string | null;
  notes: string;
  createdAt: string;
}

export interface LowStockLite {
  id: number;
  name: string;
  sku: string;
  stock: number;
  lowStock: number;
  cost: string;
}

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "#6b7280" },
  sent: { label: "Отправлена", color: "#3b82f6" },
  confirmed: { label: "Подтверждена", color: "#8b5cf6" },
  shipped: { label: "В пути", color: "#f97316" },
  received: { label: "Принята", color: "#22c55e" },
  cancelled: { label: "Отменена", color: "#ef4444" },
};

const CATEGORY: Record<string, { label: string; icon: string; color: string }> = {
  raw_materials: { label: "Сырьё", icon: "🧪", color: "#8b5cf6" },
  packaging: { label: "Упаковка", icon: "📦", color: "#f97316" },
  chemicals: { label: "Химия", icon: "🧴", color: "#3b82f6" },
  logistics: { label: "Логистика", icon: "🚚", color: "#22c55e" },
  equipment: { label: "Оборудование", icon: "⚙️", color: "#ec4899" },
};

export function SuppliersClient({
  suppliers,
  orders,
  lowStock,
}: {
  suppliers: SupplierLite[];
  orders: PurchaseLite[];
  lowStock: LowStockLite[];
}) {
  const [tab, setTab] = useState("suppliers");
  const [q, setQ] = useState("");
  const [supModal, setSupModal] = useState(false);
  const [poModal, setPoModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supForm, setSupForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    city: "Tashkent",
    category: "raw_materials",
    leadTimeDays: "7",
  });
  const [poForm, setPoForm] = useState({
    supplierId: String(suppliers[0]?.id ?? ""),
    notes: "",
    items: [] as { productId: number; qty: number }[],
  });
  const toast = useToast();
  const tr = useT();
  const router = useRouter();
  const now = useNow();

  const filtered = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          q === "" ||
          `${s.name} ${s.contactPerson} ${s.city} ${s.phone}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [suppliers, q],
  );

  const totalPurchased = suppliers.reduce((a, s) => a + Number(s.totalPurchased), 0);
  const activeOrders = orders.filter((o) => !["received", "cancelled"].includes(o.status));
  const inTransitSum = activeOrders.reduce((a, o) => a + Number(o.total), 0);
  const avgLead = Math.round(
    suppliers.reduce((a, s) => a + s.leadTimeDays, 0) / Math.max(1, suppliers.length),
  );

  const addLowStockToPO = () => {
    const items = lowStock.slice(0, 8).map((p) => ({
      productId: p.id,
      qty: Math.max(50, p.lowStock * 3 - p.stock),
    }));
    setPoForm((f) => ({ ...f, items, notes: "Автозаказ по критическим остаткам склада" }));
    setPoModal(true);
  };

  const createSupplier = async () => {
    if (!supForm.name.trim()) {
      toast("Укажите название поставщика", "err");
      return;
    }
    setBusy(true);
    try {
      await postManage("createSupplier", { ...supForm, leadTimeDays: Number(supForm.leadTimeDays) || 7 });
      toast(`Поставщик «${supForm.name}» добавлен`);
      setSupModal(false);
      setSupForm({ name: "", contactPerson: "", phone: "", email: "", city: "Tashkent", category: "raw_materials", leadTimeDays: "7" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const createPO = async () => {
    if (poForm.items.length === 0) {
      toast("Добавьте позиции в закупку", "err");
      return;
    }
    setBusy(true);
    try {
      const res = await postManage("createPurchaseOrder", {
        supplierId: Number(poForm.supplierId),
        items: poForm.items,
        notes: poForm.notes,
      });
      toast(`Закупка ${(res as { number?: string }).number ?? ""} создана и отправлена поставщику`);
      setPoModal(false);
      setPoForm({ supplierId: String(suppliers[0]?.id ?? ""), notes: "", items: [] });
      setTab("orders");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const receivePO = async (id: number, number: string) => {
    try {
      const res = await postManage("receivePurchaseOrder", { id });
      toast(`Партия ${number} принята: остатки пополнены (${(res as { items?: number }).items ?? 0} позиций)`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
  };

  const exportSuppliers = () => {
    const headers = ["Поставщик", "Контакт", "Телефон", "Email", "Город", "Категория", "Рейтинг", "Срок поставки (дн)", "Закуплено на сумму"];
    const rows = filtered.map((s) => [
      s.name,
      s.contactPerson,
      s.phone,
      s.email,
      s.city,
      CATEGORY[s.category]?.label ?? s.category,
      String(s.rating),
      String(s.leadTimeDays),
      s.totalPurchased,
    ]);
    exportXLSX(headers, rows, `delis-suppliers-${new Date().toISOString().slice(0, 10)}`);
    toast("Список поставщиков выгружен в XLSX");
  };

  return (
    <>
      <PageHeader
        title={tr("suppliers.title")}
        subtitle={tr("suppliers.subtitle")}
        actions={
          <>
            <button className="btn" onClick={exportSuppliers}>
              <Download size={15} /> {tr("orders.exportXlsx")}
            </button>
            <button className="btn" onClick={() => setSupModal(true)}>
              <Building2 size={15} /> {tr("suppliers.supplier")}
            </button>
            <button className="btn btn-primary" onClick={() => setPoModal(true)}>
              <Plus size={15} /> {tr("suppliers.createPurchase")}
            </button>
          </>
        }
      />

      {/* KPI */}
      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: tr("suppliers.count"), value: String(suppliers.length), color: "#8b5cf6", icon: "🏭" },
          { label: tr("suppliers.purchased"), value: compact(totalPurchased), color: "#22c55e", icon: "💰" },
          { label: tr("suppliers.activePurchases"), value: String(activeOrders.length), color: "#3b82f6", icon: "📋" },
          { label: tr("suppliers.inTransit"), value: compact(inTransitSum), color: "#f97316", icon: "🚚" },
          { label: tr("suppliers.avgLeadTime"), value: `${avgLead} дн`, color: "#14b8a6", icon: "⏱️" },
          { label: tr("suppliers.needPurchase"), value: String(lowStock.length), color: "#ef4444", icon: "⚠️" },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: s.color }}>
              {s.icon} {s.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Алерт по критическим остаткам */}
      {lowStock.length > 0 && (
        <Card hover={false} className="!p-0 overflow-hidden">
          <div
            className="card-pad flex flex-wrap items-center justify-between gap-3"
            style={{ background: "linear-gradient(120deg, color-mix(in srgb, #ef4444 12%, transparent), transparent)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl grid place-items-center" style={{ background: "color-mix(in srgb, #ef4444 18%, transparent)", color: "#ef4444" }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {lowStock.length} товаров ниже минимального остатка
                </div>
                <div className="text-xs muted">
                  {lowStock.slice(0, 3).map((p) => p.name).join(" · ")}
                  {lowStock.length > 3 ? ` и ещё ${lowStock.length - 3}` : ""}
                </div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={addLowStockToPO}>
              <ShoppingBag size={15} /> {tr("suppliers.orderOneClick")}
            </button>
          </div>
        </Card>
      )}

      <Card hover={false} className="flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "suppliers", label: tr("suppliers.tabSuppliers"), count: suppliers.length },
            { key: "orders", label: tr("suppliers.tabPurchases"), count: orders.length },
          ]}
        />
        {tab === "suppliers" && (
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
            <input className="input !pl-9" placeholder="Поиск по названию, контакту, городу" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
      </Card>

      {/* Поставщики */}
      {tab === "suppliers" && (
        <div className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => {
            const cat = CATEGORY[s.category] ?? CATEGORY.chemicals;
            return (
              <Card key={s.id} delay={i * 0.04}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl grid place-items-center text-xl shrink-0"
                    style={{ background: `color-mix(in srgb, ${cat.color} 18%, transparent)` }}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-xs muted truncate">{s.contactPerson || "Контакт не указан"}</div>
                  </div>
                  <Badge color={cat.color}>{cat.label}</Badge>
                </div>

                <div className="flex items-center gap-1 mt-3">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      size={13}
                      fill={idx < s.rating ? "#f59e0b" : "transparent"}
                      color={idx < s.rating ? "#f59e0b" : "var(--muted)"}
                    />
                  ))}
                  <span className="text-xs muted ml-1">рейтинг {s.rating}/5</span>
                </div>

                <div className="flex flex-col gap-1.5 mt-3 text-xs muted">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} /> {s.phone}
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={12} /> {s.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin size={12} /> {s.city}, {s.country}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                    <div className="muted">{tr("suppliers.purchased")}</div>
                    <div className="font-semibold mt-0.5">{compact(s.totalPurchased)}</div>
                  </div>
                  <div className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                    <div className="muted">{tr("suppliers.leadTime")}</div>
                    <div className="font-semibold mt-0.5">{s.leadTimeDays} дней</div>
                  </div>
                </div>

                {s.notes && <p className="text-xs muted mt-3 line-clamp-2">{s.notes}</p>}

                <button
                  className="btn w-full justify-center mt-4"
                  onClick={() => {
                    setPoForm((f) => ({ ...f, supplierId: String(s.id) }));
                    setPoModal(true);
                  }}
                >
                  <Truck size={14} /> {tr("suppliers.orderFromSupplier")}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Закупки */}
      {tab === "orders" && (
        <Card hover={false} className="!p-0">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Поставщик</th>
                  <th>Сумма</th>
                  <th className="hidden md:table-cell">Ожидается</th>
                  <th>Статус</th>
                  <th className="hidden lg:table-cell">Создана</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const st = PO_STATUS[o.status] ?? PO_STATUS.draft;
                  const isLate =
                    now > 0 && !!o.expectedAt && !o.receivedAt && new Date(o.expectedAt).getTime() < now;
                  return (
                    <tr key={o.id}>
                      <td className="font-semibold">{o.number}</td>
                      <td className="truncate max-w-[200px]">{o.supplierName ?? "—"}</td>
                      <td className="font-semibold whitespace-nowrap">{money(o.total)}</td>
                      <td className="muted hidden md:table-cell whitespace-nowrap">
                        {o.expectedAt ? dateOnly(o.expectedAt) : "—"}
                        {isLate && (
                          <span className="ml-1.5" style={{ color: "var(--error)" }}>
                            просрочка
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge color={st.color}>{st.label}</Badge>
                      </td>
                      <td className="muted hidden lg:table-cell whitespace-nowrap">{dt(o.createdAt)}</td>
                      <td>
                        {o.status !== "received" && o.status !== "cancelled" ? (
                          <button className="btn !py-1 !px-3" onClick={() => receivePO(o.id, o.number)}>
                            <PackageCheck size={13} /> {tr("suppliers.receive")}
                          </button>
                        ) : (
                          <span className="text-xs muted">
                            {o.receivedAt ? dateOnly(o.receivedAt) : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted text-center py-8">
                      Закупок пока нет — создайте первую
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Модалка поставщика */}
      {supModal && (
        <Modal open onClose={() => setSupModal(false)} title="Новый поставщик" wide>
          <div className="grid md:grid-cols-2 gap-3.5">
            <input className="input md:col-span-2" placeholder="Название компании" value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} />
            <input className="input" placeholder="Контактное лицо" value={supForm.contactPerson} onChange={(e) => setSupForm({ ...supForm, contactPerson: e.target.value })} />
            <input className="input" placeholder="Телефон" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
            <input className="input" placeholder="Email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} />
            <input className="input" placeholder="Город" value={supForm.city} onChange={(e) => setSupForm({ ...supForm, city: e.target.value })} />
            <select className="input" value={supForm.category} onChange={(e) => setSupForm({ ...supForm, category: e.target.value })}>
              {Object.entries(CATEGORY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
            <input className="input" type="number" placeholder="Срок поставки (дней)" value={supForm.leadTimeDays} onChange={(e) => setSupForm({ ...supForm, leadTimeDays: e.target.value })} />
          </div>
          <button className="btn btn-primary w-full justify-center mt-4" disabled={busy} onClick={createSupplier}>
            {busy ? "Сохраняем…" : "Добавить поставщика"}
          </button>
        </Modal>
      )}

      {/* Модалка закупки */}
      {poModal && (
        <Modal open onClose={() => setPoModal(false)} title="Новая закупка" wide>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs muted uppercase tracking-wider">Поставщик</label>
              <select className="input mt-1.5" value={poForm.supplierId} onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · доставка {s.leadTimeDays} дн
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider">
                Позиции закупки ({poForm.items.length})
              </label>
              <div className="flex flex-col gap-2 mt-2 max-h-[40vh] overflow-y-auto">
                {poForm.items.map((it, idx) => {
                  const p = lowStock.find((x) => x.id === it.productId);
                  return (
                    <div key={idx} className="flex items-center gap-2 rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                      <span className="flex-1 text-sm truncate">
                        {p?.name ?? `Товар #${it.productId}`}
                        {p && <span className="muted text-xs"> · остаток {p.stock}</span>}
                      </span>
                      <input
                        type="number"
                        className="input !w-24 text-right"
                        value={it.qty}
                        onChange={(e) => {
                          const qty = Number(e.target.value);
                          setPoForm((f) => ({
                            ...f,
                            items: f.items.map((x, i) => (i === idx ? { ...x, qty } : x)),
                          }));
                        }}
                      />
                      <button
                        className="btn !px-2"
                        onClick={() => setPoForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                      >
                        <Trash2 size={13} color="var(--error)" />
                      </button>
                    </div>
                  );
                })}
                {poForm.items.length === 0 && (
                  <div className="text-sm muted text-center py-6 rounded-2xl border border-dashed" style={{ borderColor: "rgba(var(--border))" }}>
                    Добавьте товары из списка ниже
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider">Добавить товар с низким остатком</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStock
                  .filter((p) => !poForm.items.some((i) => i.productId === p.id))
                  .map((p) => (
                    <button
                      key={p.id}
                      className="chip"
                      style={{ borderColor: "rgba(var(--border))" }}
                      onClick={() =>
                        setPoForm((f) => ({
                          ...f,
                          items: [...f.items, { productId: p.id, qty: Math.max(50, p.lowStock * 3 - p.stock) }],
                        }))
                      }
                    >
                      + {p.name} <span className="muted">({p.stock})</span>
                    </button>
                  ))}
                {lowStock.length === 0 && <span className="text-xs muted">Все остатки в норме 👍</span>}
              </div>
            </div>

            <input className="input" placeholder="Комментарий к закупке" value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} />

            <button className="btn btn-primary justify-center" disabled={busy} onClick={createPO}>
              {busy ? "Создаём…" : `Создать закупку · ${poForm.items.length} позиций`}
            </button>
            <p className="text-xs muted text-center">
              После приёма партии остатки склада увеличатся автоматически, а расход отразится в финансах.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
