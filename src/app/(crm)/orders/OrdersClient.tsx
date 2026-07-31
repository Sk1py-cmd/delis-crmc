"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Download, Filter, Check, RotateCcw, LayoutGrid, List } from "lucide-react";
import { Card, Badge, Tabs, PageHeader, Avatar } from "@/shared/ui/kit";
import { MobileTableCard, MobileFieldRow } from "@/shared/ui/MobileTableCard";
import { ORDER_STATUSES, SOURCE_LABEL, dt, money, statusMeta, timeOnly } from "@/shared/lib/format";
import { useSortable } from "@/shared/lib/useSortable";
import { exportXLSX } from "@/shared/lib/excel";
import { useToast } from "@/shared/ui/Toast";
import type { OrderRow } from "@/server/queries";
import { useT } from "@/shared/i18n/useT";

export function OrdersClient({ orders }: { orders: OrderRow[] }) {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("all");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [undoQueue, setUndoQueue] = useState<{ id: number; from: string; to: string } | null>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
  const router = useRouter();
  const toast = useToast();
  const tr = useT();

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: orders.length };
    orders.forEach((o) => (m[o.status] = (m[o.status] ?? 0) + 1));
    return m;
  }, [orders]);

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (tab === "all" || o.status === tab) &&
          (channel === "all" || o.channel === channel) &&
          (q === "" ||
            o.number.toLowerCase().includes(q.toLowerCase()) ||
            (o.customer ?? "").toLowerCase().includes(q.toLowerCase())),
      ),
    [orders, tab, q, channel],
  );

  const { sorted, SortTh } = useSortable(filtered, "createdAt", "desc");

  const changeStatus = (id: number, status: string) => {
    setOpenMenu(null);
    const from = orders.find((o) => o.id === id)?.status ?? "";
    setUndoQueue({ id, from, to: status });
    start(async () => {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
      toast(`Статус обновлён: ${ORDER_STATUSES.find((s) => s.key === status)?.label}`);
      setTimeout(() => setUndoQueue(null), 5000);
    });
  };

  const undoStatus = () => {
    if (!undoQueue) return;
    const { id, from } = undoQueue;
    setUndoQueue(null);
    start(async () => {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: from }),
      });
      router.refresh();
      toast(tr("orders.statusReturned"));
    });
  };

  const exportXlsx = () => {
    const headers = ["Номер", "Клиент", "Город", "Канал", "Оплата", "Сумма", "Прибыль", "Статус", "Дата"];
    const rows = filtered.map((o) => [
      o.number,
      o.customer ?? "",
      o.city ?? "",
      SOURCE_LABEL[o.channel] ?? o.channel,
      o.payment,
      o.total,
      o.profit,
      statusMeta(o.status).label,
      new Date(o.createdAt).toLocaleDateString("ru-RU"),
    ]);
    exportXLSX(headers, rows, `delis-orders-${new Date().toISOString().slice(0, 10)}`);
    toast(tr("orders.excelSaved"));
  };

  const sum = filtered.reduce((a, o) => a + Number(o.total), 0);

  return (
    <>
      <PageHeader
        title={tr("orders.title")}
        subtitle={`${filtered.length} · ${money(sum)}`}
        actions={
          <>
            <button className="btn" onClick={exportXlsx}>
              <Download size={15} /> {tr("orders.exportXlsx")}
            </button>
            <Link href="/orders/new" className="btn btn-primary">
              {tr("orders.newOrder")}
            </Link>
          </>
        }
      />

      <Card hover={false} className="flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[{ key: "all", label: tr("common.all"), count: counts.all }, ...ORDER_STATUSES.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] ?? 0 }))]}
        />
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
            <input className="input !pl-9" placeholder={tr("orders.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="relative">
            <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted pointer-events-none" />
            <select className="input !pl-9 !pr-8" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="all">{tr("orders.allChannels")}</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden md:flex gap-1 p-1 rounded-full shrink-0" style={{ background: "rgba(var(--surface),0.6)", border: "1px solid rgba(var(--border))" }}>
            <button className="btn !border-0 !bg-transparent !px-2.5" style={{ color: view === "table" ? "var(--primary)" : "var(--muted)" }} onClick={() => setView("table")}>
              <List size={16} />
            </button>
            <button className="btn !border-0 !bg-transparent !px-2.5" style={{ color: view === "kanban" ? "var(--primary)" : "var(--muted)" }} onClick={() => setView("kanban")}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* Kanban view */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar hidden md:flex min-h-[60vh] snap-x">
          {ORDER_STATUSES.slice(0, 6).map((status) => {
            const columnOrders = sorted.filter((o) => o.status === status.key);
            const colSum = columnOrders.reduce((a, o) => a + Number(o.total), 0);
            return (
              <div
                key={status.key}
                className="flex-shrink-0 flex flex-col gap-3 w-[290px] rounded-3xl p-3 snap-start transition-colors"
                style={{ background: "rgba(var(--surface),0.3)", border: "1px dashed rgba(var(--border))" }}
                onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.background = "rgba(var(--surface),0.8)"; }}
                onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(var(--surface),0.3)"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = "rgba(var(--surface),0.3)";
                  if (draggedOrderId && draggedOrderId !== 0) {
                    const currentOrder = orders.find(o => o.id === draggedOrderId);
                    if (currentOrder && currentOrder.status !== status.key) {
                      changeStatus(draggedOrderId, status.key);
                    }
                  }
                  setDraggedOrderId(null);
                }}
              >
                <div className="flex items-center justify-between px-2 pt-1">
                  <Badge color={status.color}>{status.label}</Badge>
                  <span className="text-xs font-semibold">{columnOrders.length}</span>
                </div>
                <div className="text-xs muted px-2">{money(colSum)}</div>
                
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] no-scrollbar">
                  <AnimatePresence>
                    {columnOrders.map((o) => (
                      <motion.div
                        key={o.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={(e) => {
                          setDraggedOrderId(o.id);
                          (e.currentTarget as HTMLElement).style.opacity = "0.5";
                        }}
                        onDragEnd={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = "1";
                          setDraggedOrderId(null);
                        }}
                        className="glass card-pad !p-3.5 cursor-grab active:cursor-grabbing flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <Link href={`/orders/${o.id}`} className="font-bold hover:underline" style={{ color: "var(--primary)" }}>{o.number}</Link>
                          <span className="text-[10px] muted">{timeOnly(o.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar name={o.customer || "?"} size={24} color={status.color} />
                          <span className="text-sm font-medium truncate flex-1">{o.customer || tr("orders.noName")}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <Badge color="#8b5cf6">{SOURCE_LABEL[o.channel] ?? o.channel}</Badge>
                          <span className="font-bold">{money(o.total)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {columnOrders.length === 0 && (
                    <div className="text-center py-6 text-xs muted border-2 border-dashed border-[rgba(255,255,255,0.05)] rounded-2xl">
                      {tr("orders.dragHere")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop table */}
      <Card hover={false} className={`!p-0 overflow-visible hidden sm:block ${view === "kanban" ? "md:hidden" : ""}`}>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <SortTh k="number">{tr("orders.number")}</SortTh>
                <SortTh k="customer">{tr("common.customer")}</SortTh>
                <SortTh k="city">{tr("common.city")}</SortTh>
                <SortTh k="channel">{tr("common.channel")}</SortTh>
                <SortTh k="payment">{tr("common.payment")}</SortTh>
                <SortTh k="total">{tr("common.amount")}</SortTh>
                <SortTh k="profit">{tr("common.profit")}</SortTh>
                <SortTh k="status">{tr("common.status")}</SortTh>
                <SortTh k="createdAt">{tr("common.date")}</SortTh>
                <th />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {sorted.slice(0, 80).map((o, i) => {
                  const st = statusMeta(o.status);
                  return (
                    <motion.tr
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: Math.min(i * 0.008, 0.25) }}
                    >
                      <td>
                        <Link href={`/orders/${o.id}`} className="font-semibold">
                          {o.number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">{o.customer}</td>
                      <td className="muted">{o.city}</td>
                      <td className="muted">{SOURCE_LABEL[o.channel] ?? o.channel}</td>
                      <td className="capitalize muted">{o.payment}</td>
                      <td className="font-semibold whitespace-nowrap">{money(o.total)}</td>
                      <td style={{ color: "var(--success)" }} className="whitespace-nowrap">
                        {money(o.profit)}
                      </td>
                      <td>
                        <div className="relative">
                          <button className="chip" style={{ color: st.color, borderColor: `color-mix(in srgb, ${st.color} 40%, transparent)`, background: `color-mix(in srgb, ${st.color} 14%, transparent)` }} onClick={() => setOpenMenu(openMenu === o.id ? null : o.id)}>
                            {st.label}
                          </button>
                          <AnimatePresence>
                            {openMenu === o.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="glass absolute z-40 mt-2 w-52 p-1.5"
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <button
                                    key={s.key}
                                    onClick={() => changeStatus(o.id, s.key)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[0.82rem] hover:bg-[rgba(var(--table-row))]"
                                    style={{ color: s.color }}
                                  >
                                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                    <span className="flex-1 text-left">{s.label}</span>
                                    {o.status === s.key && <Check size={14} />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                      <td className="muted whitespace-nowrap">{dt(o.createdAt)}</td>
                      <td>
                        <Link href={`/orders/${o.id}`} className="btn !py-1 !px-3">
                          {tr("common.open")}
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="flex flex-col gap-[var(--gap)] sm:hidden">
        <AnimatePresence initial={false}>
          {sorted.slice(0, 40).map((o, i) => {
            const st = statusMeta(o.status);
            return (
              <MobileTableCard key={o.id} index={i} actions={
                <Link href={`/orders/${o.id}`} className="btn flex-1 justify-center">{tr("common.open")}</Link>
              }>
                <MobileFieldRow label={tr("orders.number")} value={<Link href={`/orders/${o.id}`} className="font-semibold">{o.number}</Link>} />
                <MobileFieldRow label={tr("common.customer")} value={o.customer ?? ""} />
                <MobileFieldRow label={tr("common.channel")} value={SOURCE_LABEL[o.channel] ?? o.channel} />
                <MobileFieldRow label={tr("common.amount")} value={<span className="font-semibold">{money(o.total)}</span>} />
                <MobileFieldRow label={tr("common.status")} value={<Badge color={st.color}>{st.label}</Badge>} />
                <MobileFieldRow label={tr("common.date")} value={dt(o.createdAt)} />
              </MobileTableCard>
            );
          })}
        </AnimatePresence>
      </div>

      {pending && <div className="p-3 text-center text-xs muted">{tr("orders.updating")}</div>}

      <AnimatePresence>
        {undoQueue && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            className="glass card-pad fixed bottom-6 right-6 z-[120] flex items-center gap-3 text-sm"
            style={{ borderColor: "color-mix(in srgb, var(--warning) 45%, transparent)" }}
          >
            <span>{tr("orders.statusChanged")}</span>
            <button className="btn !py-1" onClick={undoStatus}>
              <RotateCcw size={13} /> {tr("orders.undo")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-[var(--gap)] md:grid-cols-4 hidden sm:grid">
        {["new", "processing", "shipped", "delivered"].map((k) => {
          const st = statusMeta(k);
          const list = orders.filter((o) => o.status === k);
          return (
            <Card key={k}>
              <div className="flex items-center justify-between mb-2">
                <Badge color={st.color}>{st.label}</Badge>
                <span className="muted text-xs">{list.length} шт</span>
              </div>
              <div className="text-lg font-semibold">{money(list.reduce((a, o) => a + Number(o.total), 0))}</div>
              <div className="muted text-xs mt-1">{tr("orders.funnelTotal")}</div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
