"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Download, Upload, LayoutGrid, List, Trash2, Pencil, Package, ExternalLink } from "lucide-react";
import { Card, PageHeader, Badge, Tabs, Modal, Progress } from "@/shared/ui/kit";
import { money, num } from "@/shared/lib/format";
import type { ProductRow } from "@/server/queries";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { ProductThumb } from "@/shared/ui/ProductThumb";
import { ImageUploader } from "@/shared/ui/ImageUploader";
import { useT } from "@/shared/i18n/useT";

const EMOJI = ["🧴", "🚗", "✨", "🪟", "⚙️", "🧹", "🍋", "🌿", "🧺", "🤍", "🌸", "🛁", "🌊", "🔥", "🛞", "🪑"];

interface Draft {
  id?: number;
  name: string;
  sku: string;
  price: string;
  cost: string;
  stock: number;
  volume: string;
  image: string;
  images: string[];
  description: string;
  status: string;
}

const empty: Draft = {
  name: "",
  sku: "",
  price: "0",
  cost: "0",
  stock: 0,
  volume: "1 L",
  image: "🧴",
  images: [],
  description: "",
  status: "active",
};

export function ProductsClient({ products, categories }: { products: ProductRow[]; categories: string[] }) {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const tr = useT();

  const importCsv = async (file: File) => {
    const text = await file.text();
    const delim = text.includes(";") ? ";" : ",";
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const rows = lines.slice(1).map((l) => {
      const [name, price, cost, stock, volume] = l.split(delim).map((x) => x.trim().replace(/^"|"$/g, ""));
      return { name, price: Number(price) || 0, cost: Number(cost) || 0, stock: Number(stock) || 0, volume: volume || "1 L" };
    });
    try {
      const res = await postManage("importProducts", { rows });
      toast(`Импортировано товаров: ${res.count ?? 0}`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка импорта", "err");
    }
  };

  const downloadTemplate = () => {
    const csv = "name;price;cost;stock;volume\nDELIS Example Cleaner;25000;12000;100;1 L";
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "delis-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "all" || p.category === cat) &&
          (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())),
      ),
    [products, q, cat],
  );

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    setDraft(null);
    router.refresh();
  };

  const remove = async (id: number) => {
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const exportCsv = () => {
    const rows = [
      ["SKU", "Название", "Категория", "Объём", "Цена", "Себестоимость", "Маржа %", "Остаток", "Продано"],
      ...filtered.map((p) => [
        p.sku,
        p.name,
        p.category,
        p.volume,
        p.price,
        p.cost,
        (((Number(p.price) - Number(p.cost)) / Number(p.price)) * 100).toFixed(1),
        String(p.stock),
        String(p.sold),
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "delis-products.csv";
    a.click();
  };

  const totalValue = filtered.reduce((a, p) => a + Number(p.price) * p.stock, 0);

  return (
    <>
      <PageHeader
        title={tr("products.title")}
        subtitle={`${filtered.length} SKU · ${money(totalValue)}`}
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Download size={15} /> Экспорт
            </button>
            <button className="btn" onClick={downloadTemplate}>
              {tr("products.templateCsv")}
            </button>
            <label className="btn cursor-pointer">
              <Upload size={15} /> Импорт CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importCsv(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button className="btn btn-primary" onClick={() => setDraft({ ...empty })}>
              <Plus size={15} /> {tr("products.addProduct")}
            </button>
          </>
        }
      />

      <Card hover={false} className="flex flex-wrap items-center gap-3">
        <Tabs value={cat} onChange={setCat} items={[{ key: "all", label: tr("products.allCategories") }, ...categories.map((c) => ({ key: c, label: c }))]} />
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
          <input className="input !pl-9" placeholder={tr("products.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(var(--surface),0.6)", border: "1px solid rgba(var(--border))" }}>
          <button className="btn !border-0 !bg-transparent !px-2.5" style={{ color: view === "grid" ? "var(--primary)" : "var(--muted)" }} onClick={() => setView("grid")}>
            <LayoutGrid size={16} />
          </button>
          <button className="btn !border-0 !bg-transparent !px-2.5" style={{ color: view === "table" ? "var(--primary)" : "var(--muted)" }} onClick={() => setView("table")}>
            <List size={16} />
          </button>
        </div>
      </Card>

      {view === "grid" ? (
        <motion.div layout className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence>
            {filtered.map((p, i) => {
              const margin = ((Number(p.price) - Number(p.cost)) / Math.max(Number(p.price), 1)) * 100;
              return (
                <motion.div
                  layout
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.02, 0.25) }}
                  whileHover={{ y: -4 }}
                  className="glass card-pad relative overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <ProductThumb src={p.image} name={p.name} size={64} radius={18} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium leading-5 line-clamp-2">{p.name}</div>
                      <div className="text-xs muted mt-1">
                        {p.sku} · {p.volume}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {p.isNew && <Badge color="#3b82f6">NEW</Badge>}
                        {p.isPopular && <Badge color="#8b5cf6">HIT</Badge>}
                        {p.stock < p.lowStock && <Badge color="#ef4444">{tr("products.low")}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-4">
                    <div>
                      <div className="text-lg font-semibold">{money(p.price)}</div>
                      <div className="text-xs muted">{tr("products.cost")} {money(p.cost)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs muted">{tr("products.margin")}</div>
                      <div className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                        {margin.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs muted mb-1.5">
                      <span>{tr("products.stock")} {p.stock} {tr("common.pcs")}</span>
                      <span>{num(p.sold)} {tr("products.sold")}</span>
                    </div>
                    <Progress value={(p.stock / Math.max(p.lowStock * 4, 1)) * 100} color={p.stock < p.lowStock ? "#ef4444" : "var(--primary)"} />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <a href={`/products/${p.id}`} className="btn flex-1 justify-center" style={{ textDecoration: "none" }}>
                      <ExternalLink size={14} /> Открыть
                    </a>
                    <button
                      className="btn flex-1 justify-center"
                      onClick={() =>
                        setDraft({
                          id: p.id,
                          name: p.name,
                          sku: p.sku,
                          price: String(p.price),
                          cost: String(p.cost),
                          stock: p.stock,
                          volume: p.volume,
                           image: p.image,
                           images: Array.isArray(p.images) ? p.images : [],
                           description: p.description,
                           status: p.status,
                         })
                      }
                    >
                      <Pencil size={14} /> {tr("common.edit")}
                    </button>
                    <button className="btn !px-2.5" onClick={() => remove(p.id)}>
                      <Trash2 size={14} color="var(--error)" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <Card hover={false} className="!p-0">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>{tr("common.product")}</th>
                  <th>SKU</th>
                  <th>{tr("common.category")}</th>
                  <th>{tr("common.price")}</th>
                  <th>{tr("products.cost")}</th>
                  <th>{tr("products.margin")}</th>
                  <th>{tr("products.stock")}</th>
                  <th>{tr("products.sold")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-2.5 h-[var(--row)]">
                        <ProductThumb src={p.image} name={p.name} size={34} radius={10} />
                        <span className="truncate max-w-[240px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="muted font-mono text-xs">{p.sku}</td>
                    <td className="muted">{p.category}</td>
                    <td className="font-semibold">{money(p.price)}</td>
                    <td className="muted">{money(p.cost)}</td>
                    <td style={{ color: "var(--success)" }}>
                      {(((Number(p.price) - Number(p.cost)) / Math.max(Number(p.price), 1)) * 100).toFixed(0)}%
                    </td>
                    <td>
                      <Badge color={p.stock < p.lowStock ? "#ef4444" : "#22c55e"}>{p.stock} шт</Badge>
                    </td>
                    <td className="muted">{num(p.sold)}</td>
                    <td>
                      <button className="btn !py-1 !px-3" onClick={() => setDraft({ id: p.id, name: p.name, sku: p.sku, price: String(p.price), cost: String(p.cost), stock: p.stock, volume: p.volume, image: p.image, images: Array.isArray(p.images) ? p.images : [], description: p.description, status: p.status })}>
                        {tr("common.edit")}
                           images: Array.isArray(p.images) ? p.images : [],
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {draft && (
          <Modal open onClose={() => setDraft(null)} title={draft.id ? tr("products.editProduct") : tr("products.newProduct")} wide>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs muted uppercase tracking-wider">{tr("common.name")}</label>
                <input className="input mt-1.5" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs muted uppercase tracking-wider">SKU</label>
                <input className="input mt-1.5" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
              </div>
              <div>
                <label className="text-xs muted uppercase tracking-wider">{tr("products.volume")}</label>
                <input className="input mt-1.5" value={draft.volume} onChange={(e) => setDraft({ ...draft, volume: e.target.value })} />
              </div>
              <div>
                <label className="text-xs muted uppercase tracking-wider">{tr("common.price")}</label>
                <input className="input mt-1.5" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs muted uppercase tracking-wider">{tr("products.cost")}</label>
                <input className="input mt-1.5" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
              </div>
              <div>
                <label className="text-xs muted uppercase tracking-wider">{tr("products.stock")}</label>
                <input type="number" className="input mt-1.5" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs muted uppercase tracking-wider">{tr("common.status")}</label>
                <select className="input mt-1.5" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  <option value="active">{tr("products.active")}</option>
                  <option value="draft">{tr("products.draft")}</option>
                  <option value="archived">{tr("products.archived")}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs muted uppercase tracking-wider">{tr("products.description")}</label>
                <textarea className="input mt-1.5 min-h-24" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs muted uppercase tracking-wider">{tr("products.photos")}</label>
                <div className="mt-2">
                  <ImageUploader
                    productId={draft.id}
                    images={draft.images.length > 0 ? draft.images : draft.image ? [draft.image] : []}
                    onChange={(imgs: string[]) => setDraft({ ...draft, images: imgs, image: imgs[0] ?? "🧴" })}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs muted uppercase tracking-wider">{tr("products.icon")}</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EMOJI.map((e) => (
                    <motion.button
                      key={e}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setDraft({ ...draft, image: e, images: [] })}
                      className="w-11 h-11 rounded-2xl grid place-items-center text-xl"
                      style={{
                        background: draft.image === e && draft.images.length === 0 ? "linear-gradient(135deg,var(--primary),var(--accent))" : "rgba(var(--table-row))",
                        border: "1px solid rgba(var(--border))",
                      }}
                    >
                      {e}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="btn btn-primary flex-1 justify-center" disabled={saving} onClick={save}>
                {saving ? tr("common.saving") : tr("common.save")}
              </button>
              <button className="btn" onClick={() => setDraft(null)}>
                {tr("common.cancel")}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
