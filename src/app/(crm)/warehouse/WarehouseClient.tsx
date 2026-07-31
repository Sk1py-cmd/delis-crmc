"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ScanLine, ArrowDownToLine, ArrowUpFromLine, Shuffle, Trash, Download } from "lucide-react";
import { Card, PageHeader, Badge, Modal, Progress } from "@/shared/ui/kit";
import { StatGrid } from "@/widgets/StatCard";
import { money, dt, num } from "@/shared/lib/format";
import type { ProductRow } from "@/server/queries";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { exportXLSX } from "@/shared/lib/excel";
import { BarcodeScannerModal } from "@/shared/ui/BarcodeScannerModal";
import { useT } from "@/shared/i18n/useT";

interface Move {
  id: number;
  kind: string;
  qty: number;
  note: string;
  createdAt: string;
  product: string;
}

const KIND: Record<string, { label: string; color: string }> = {
  in: { label: "Приход", color: "#22c55e" },
  out: { label: "Расход", color: "#3b82f6" },
  transfer: { label: "Перемещение", color: "#8b5cf6" },
  writeoff: { label: "Списание", color: "#ef4444" },
};

export function WarehouseClient({ products, moves }: { products: ProductRow[]; moves: Move[] }) {
  const [modal, setModal] = useState<{ productId: number; kind: string } | null>(null);
  const [qty, setQty] = useState(10);
  const [note, setNote] = useState("");
  const [scan, setScan] = useState("");
  const [inv, setInv] = useState(false);
  const [invMap, setInvMap] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const tr = useT();

  const openInventory = () => {
    setInvMap(Object.fromEntries(products.map((p) => [p.id, p.stock])));
    setInv(true);
  };

  const exportXlsx = () => {
    const headers = ["SKU", "Название", "Категория", "Объём", "Цена", "Себестоимость", "Остаток", "Порог низкого остатка", "Статус", "Продано"];
    const rows = products.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.volume,
      p.price,
      p.cost,
      String(p.stock),
      String(p.lowStock),
      p.stock < p.lowStock ? "Низкий остаток" : "В норме",
      String(p.sold),
    ]);
    exportXLSX(headers, rows, `delis-warehouse-${new Date().toISOString().slice(0, 10)}`);
    toast("Отчёт по складу выгружен в XLSX");
  };

  const applyInventory = async () => {
    setBusy(true);
    try {
      const res = await postManage("inventory", {
        items: Object.entries(invMap).map(([k, v]) => ({ productId: Number(k), fact: Number(v) })),
      });
      toast(`Инвентаризация завершена: корректировок — ${res.count ?? 0}`);
      setInv(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const totalUnits = products.reduce((a, p) => a + p.stock, 0);
  const totalValue = products.reduce((a, p) => a + p.stock * Number(p.cost), 0);
  const low = products.filter((p) => p.stock < p.lowStock);

  const apply = async () => {
    if (!modal) return;
    await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: modal.productId, kind: modal.kind, qty, note: note || KIND[modal.kind].label }),
    });
    setModal(null);
    setNote("");
    router.refresh();
  };

  const scanned = products.find((p) => p.barcode === scan.trim() || p.sku.toLowerCase() === scan.trim().toLowerCase());

  return (
    <>
      <PageHeader
        title={tr("warehouse.title")}
        subtitle={tr("warehouse.subtitle")}
        actions={
          <>
            <button className="btn" onClick={exportXlsx}>
              <Download size={15} /> {tr("orders.exportXlsx")}
            </button>
            <button className="btn" onClick={openInventory}>
              {tr("warehouse.inventory")}
            </button>
            <button className="btn btn-primary" onClick={() => setModal({ productId: products[0]?.id ?? 0, kind: "in" })}>
              <ArrowDownToLine size={15} /> {tr("warehouse.receiveGoods")}
            </button>
          </>
        }
      />

      <StatGrid
        stats={[
          { label: tr("warehouse.skuCount"), value: products.length, color: "#8b5cf6", icon: "📦", mode: "num" },
          { label: tr("warehouse.units"), value: totalUnits, color: "#3b82f6", icon: "🏷️", mode: "num" },
          { label: tr("warehouse.stockValue"), value: totalValue, color: "#22c55e", icon: "💎" },
          { label: tr("warehouse.lowStock"), value: low.length, color: "#f97316", icon: "⚠️", mode: "num" },
          { label: tr("warehouse.movements"), value: moves.length, color: "#ec4899", icon: "🔁", mode: "num" },
          { label: tr("warehouse.warehouses"), value: 3, color: "#14b8a6", icon: "🏭", mode: "num" },
        ]}
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card>
          <h3 className="font-semibold mb-1">{tr("warehouse.scanner")}</h3>
          <p className="muted text-xs mb-3">{tr("warehouse.scannerHint")}</p>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <ScanLine size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
              <input className="input !pl-9" placeholder="48600100000 или DLS-1000" value={scan} onChange={(e) => setScan(e.target.value)} />
            </div>
            <button className="btn btn-primary !px-3" onClick={() => setScanModal(true)}>{tr("warehouse.camera")}</button>
          </div>
          <motion.div layout className="mt-4">
            {scanned ? (
              <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{scanned.image}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{scanned.name}</div>
                    <div className="text-xs muted">
                      {scanned.sku} · остаток {scanned.stock}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn flex-1 justify-center" onClick={() => setModal({ productId: scanned.id, kind: "in" })}>
                    {tr("warehouse.in")}
                  </button>
                  <button className="btn flex-1 justify-center" onClick={() => setModal({ productId: scanned.id, kind: "out" })}>
                    {tr("warehouse.out")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="muted text-xs">{tr("warehouse.notFound")}</div>
            )}
          </motion.div>
        </Card>

        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-3">{tr("warehouse.criticalStock")}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {products
              .slice()
              .sort((a, b) => a.stock - b.stock)
              .slice(0, 8)
              .map((p) => (
                <div key={p.id}>
                  <div className="flex justify-between text-[0.8rem] mb-1.5">
                    <span className="truncate pr-2">
                      {p.image} {p.name}
                    </span>
                    <span className="font-semibold" style={{ color: p.stock < p.lowStock ? "var(--error)" : "var(--text)" }}>
                      {p.stock}
                    </span>
                  </div>
                  <Progress value={(p.stock / Math.max(p.lowStock * 4, 1)) * 100} color={p.stock < p.lowStock ? "#ef4444" : "#22c55e"} />
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-2">
        <Card hover={false} className="!p-0">
          <h3 className="font-semibold card-pad pb-2">{tr("warehouse.stockByProduct")}</h3>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>{tr("common.product")}</th>
                  <th>{tr("products.stock")}</th>
                  <th>{tr("warehouse.value")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="truncate max-w-[220px]">
                      {p.image} {p.name}
                    </td>
                    <td>
                      <Badge color={p.stock < p.lowStock ? "#ef4444" : "#22c55e"}>{num(p.stock)} шт</Badge>
                    </td>
                    <td className="muted">{money(p.stock * Number(p.cost))}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn !px-2 !py-1" title="Приход" onClick={() => setModal({ productId: p.id, kind: "in" })}>
                          <ArrowDownToLine size={13} />
                        </button>
                        <button className="btn !px-2 !py-1" title="Расход" onClick={() => setModal({ productId: p.id, kind: "out" })}>
                          <ArrowUpFromLine size={13} />
                        </button>
                        <button className="btn !px-2 !py-1" title="Перемещение" onClick={() => setModal({ productId: p.id, kind: "transfer" })}>
                          <Shuffle size={13} />
                        </button>
                        <button className="btn !px-2 !py-1" title="Списание" onClick={() => setModal({ productId: p.id, kind: "writeoff" })}>
                          <Trash size={13} color="var(--error)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card hover={false} className="!p-0">
          <h3 className="font-semibold card-pad pb-2">{tr("warehouse.movementHistory")}</h3>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>{tr("common.status")}</th>
                  <th>{tr("common.product")}</th>
                  <th>{tr("common.qty")}</th>
                  <th>{tr("common.comment")}</th>
                  <th>{tr("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Badge color={KIND[m.kind]?.color ?? "#8b5cf6"}>{KIND[m.kind]?.label ?? m.kind}</Badge>
                    </td>
                    <td className="truncate max-w-[200px]">{m.product}</td>
                    <td className="font-semibold">{m.qty}</td>
                    <td className="muted truncate max-w-[180px]">{m.note}</td>
                    <td className="muted whitespace-nowrap">{dt(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {inv && (
        <Modal open onClose={() => setInv(false)} title="Инвентаризация склада" wide>
          <p className="muted text-xs mb-3">Укажите фактическое количество — разница будет оформлена как приход или списание.</p>
          <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                <span className="text-xl">{p.image}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.name}</div>
                  <div className="text-xs muted">По системе: {p.stock} шт</div>
                </div>
                <input
                  type="number"
                  className="input !w-24 text-right"
                  value={invMap[p.id] ?? 0}
                  onChange={(e) => setInvMap({ ...invMap, [p.id]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-primary w-full justify-center mt-4" disabled={busy} onClick={applyInventory}>
            {busy ? "Сверяем…" : "Подтвердить итоги инвентаризации"}
          </button>
        </Modal>
      )}

      {modal && (
        <Modal open onClose={() => setModal(null)} title={`${KIND[modal.kind].label} товара`}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs muted uppercase tracking-wider">Товар</label>
              <select className="input mt-1.5" value={modal.productId} onChange={(e) => setModal({ ...modal, productId: Number(e.target.value) })}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (ост. {p.stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs muted uppercase tracking-wider">Количество</label>
              <input type="number" className="input mt-1.5" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs muted uppercase tracking-wider">Комментарий</label>
              <input className="input mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: поставка от производителя" />
            </div>
            <button className="btn btn-primary justify-center" onClick={apply}>
              {tr("warehouse.confirm")}
            </button>
          </div>
        </Modal>
      )}

      <BarcodeScannerModal
        open={scanModal}
        onClose={() => setScanModal(false)}
        onScan={(code) => {
          setScan(code);
          toast(`Код отсканирован: ${code}`);
        }}
      />
    </>
  );
}
