"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Plus, PackageCheck, Ban, AlertTriangle } from "lucide-react";
import { Card, PageHeader, Badge, Modal } from "@/shared/ui/kit";
import { money, dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { useT } from "@/shared/i18n/useT";

interface ReturnLite { id: number; orderId: number; orderNumber: string; customerName: string; reason: string; status: string; refundAmount: string; restockItems: boolean; notes: string; createdBy: string; createdAt: string; }
interface OrderLite { id: number; number: string; customer: string; total: string; }

const REASONS: Record<string, { label: string; icon: string }> = {
  defect: { label: "Брак / Дефект", icon: "🔧" },
  wrong_item: { label: "Не тот товар", icon: "📦" },
  damaged: { label: "Повреждение при доставке", icon: "💥" },
  quality: { label: "Низкое качество", icon: "👎" },
  changed_mind: { label: "Передумал", icon: "🤔" },
  other: { label: "Другое", icon: "📝" },
};

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "#f97316" },
  approved: { label: "Одобрен", color: "#3b82f6" },
  refunded: { label: "Возвращён", color: "#22c55e" },
  rejected: { label: "Отклонён", color: "#ef4444" },
};

export function ReturnsClient({ returns, orders }: { returns: ReturnLite[]; orders: OrderLite[] }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ orderId: "", reason: "defect", notes: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const tr = useT();
  const router = useRouter();

  const pending = returns.filter((r) => r.status === "pending").length;
  const totalRefunded = returns.filter((r) => r.status === "refunded").reduce((a, r) => a + Number(r.refundAmount), 0);

  const create = async () => {
    if (!form.orderId) { toast("Выберите заказ", "err"); return; }
    setBusy(true);
    try {
      await postManage("createReturn", { orderId: Number(form.orderId), reason: form.reason, notes: form.notes });
      toast("Возврат оформлен — заказ переведён в статус «Возврат»");
      setModal(false); setForm({ orderId: "", reason: "defect", notes: "" }); router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Ошибка", "err"); }
    setBusy(false);
  };

  const approve = async (id: number, restock: boolean) => {
    try {
      await postManage("approveReturn", { id, restock });
      toast(restock ? "Возврат одобрен: деньги возвращены, товар на складе" : "Возврат одобрен: деньги возвращены");
      router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Ошибка", "err"); }
  };

  return (
    <>
      <PageHeader title={tr("returns.title")} subtitle={tr("returns.subtitle")}
        actions={<button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> {tr("returns.createReturn")}</button>}
      />

      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-4">
        {[
          { label: tr("returns.total"), value: String(returns.length), color: "#8b5cf6", icon: "📋" },
          { label: tr("returns.pending"), value: String(pending), color: "#f97316", icon: "⏳" },
          { label: tr("returns.refunded"), value: money(totalRefunded), color: "#ef4444", icon: "💸" },
          { label: tr("returns.rate"), value: `${returns.length > 0 ? ((returns.length / Math.max(orders.length, 1)) * 100).toFixed(1) : "0"}%`, color: "#14b8a6", icon: "📊" },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: s.color }}>{s.icon} {s.value}</div>
          </Card>
        ))}
      </div>

      <Card hover={false} className="!p-0">
        <div className="card-pad pb-2 flex items-center gap-2"><RotateCcw size={16} color="var(--primary)" /><h3 className="font-semibold">{tr("returns.history")}</h3></div>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>{tr("nav.orders")}</th><th>{tr("common.customer")}</th><th>{tr("returns.reason")}</th><th>{tr("common.amount")}</th><th>{tr("common.status")}</th><th>{tr("common.date")}</th><th /></tr></thead>
            <tbody>
              {returns.map((r) => {
                const reason = REASONS[r.reason] ?? REASONS.other;
                const st = STATUS[r.status] ?? STATUS.pending;
                return (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.orderNumber}</td>
                    <td>{r.customerName}</td>
                    <td><Badge color="#8b5cf6">{reason.icon} {reason.label}</Badge></td>
                    <td className="font-semibold" style={{ color: "var(--error)" }}>{money(r.refundAmount)}</td>
                    <td><Badge color={st.color}>{st.label}</Badge></td>
                    <td className="muted whitespace-nowrap">{dt(r.createdAt)}</td>
                    <td>
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <button className="btn !py-1 !px-3" onClick={() => approve(r.id, true)}>
                            <PackageCheck size={13} /> {tr("returns.toStock")}
                          </button>
                          <button className="btn !py-1 !px-3" onClick={() => approve(r.id, false)}>
                            {tr("returns.refundMoney")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {returns.length === 0 && <tr><td colSpan={7} className="muted text-center py-8">Возвратов пока нет</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal open onClose={() => setModal(false)} title="Оформить возврат">
          <div className="flex flex-col gap-3.5">
            <select className="input" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
              <option value="">Выберите заказ</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.number} · {o.customer} · {money(o.total)}</option>)}
            </select>
            <select className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <textarea className="input min-h-24" placeholder="Комментарий клиента или менеджера" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button className="btn btn-primary justify-center" disabled={busy} onClick={create}>{busy ? "Оформляем…" : "Оформить возврат"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
