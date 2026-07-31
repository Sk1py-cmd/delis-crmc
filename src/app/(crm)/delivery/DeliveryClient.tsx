"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Plus, Star, CheckCircle2, UserPlus, MapPin } from "lucide-react";
import { Card, PageHeader, Badge, Modal, Avatar, Progress } from "@/shared/ui/kit";
import { money, dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { useT } from "@/shared/i18n/useT";

interface CourierLite { id: number; name: string; phone: string; vehicle: string; zone: string; status: string; activeDeliveries: number; completedToday: number; rating: number; avatarColor: string; }
interface DeliveryLite { id: number; orderId: number; orderNumber: string; orderTotal: string; courierId: number | null; courierName: string; customerName: string; status: string; address: string; city: string; scheduledAt: string | null; deliveredAt: string | null; createdAt: string; }
interface OrderLite { id: number; number: string; customer: string; city: string; total: string; }

const D_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "#6b7280" },
  assigned: { label: "Назначен", color: "#3b82f6" },
  picked_up: { label: "Забран", color: "#8b5cf6" },
  in_transit: { label: "В пути", color: "#f97316" },
  delivered: { label: "Доставлен", color: "#22c55e" },
  failed: { label: "Не доставлен", color: "#ef4444" },
};

const VEHICLES: Record<string, string> = { car: "🚗 Авто", moto: "🏍️ Мото", bicycle: "🚴 Вело", walk: "🚶 Пешком" };

export function DeliveryClient({ couriers, deliveries, orders }: { couriers: CourierLite[]; deliveries: DeliveryLite[]; orders: OrderLite[] }) {
  const [assignModal, setAssignModal] = useState(false);
  const [courierModal, setCourierModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ orderId: "", courierId: String(couriers[0]?.id ?? ""), address: "", city: "Tashkent", notes: "" });
  const [courierForm, setCourierForm] = useState({ name: "", phone: "", vehicle: "car", zone: "Tashkent" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const tr = useT();
  const router = useRouter();

  const active = deliveries.filter((d) => !["delivered", "failed"].includes(d.status));
  const todayDelivered = deliveries.filter((d) => d.status === "delivered" && d.deliveredAt && new Date(d.deliveredAt).toDateString() === new Date().toDateString());

  const assign = async () => {
    if (!assignForm.orderId || !assignForm.courierId) { toast("Выберите заказ и курьера", "err"); return; }
    setBusy(true);
    try {
      await postManage("assignDelivery", { orderId: Number(assignForm.orderId), courierId: Number(assignForm.courierId), address: assignForm.address, city: assignForm.city, notes: assignForm.notes });
      toast("Доставка назначена — курьер получит уведомление");
      setAssignModal(false); router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Ошибка", "err"); }
    setBusy(false);
  };

  const addCr = async () => {
    if (!courierForm.name.trim()) { toast("Укажите имя курьера", "err"); return; }
    setBusy(true);
    try {
      await postManage("addCourier", courierForm);
      toast(`Курьер ${courierForm.name} добавлен`);
      setCourierModal(false); setCourierForm({ name: "", phone: "", vehicle: "car", zone: "Tashkent" }); router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Ошибка", "err"); }
    setBusy(false);
  };

  const complete = async (id: number) => {
    try {
      await postManage("completeDelivery", { id });
      toast("Доставка подтверждена — заказ закрыт");
      router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Ошибка", "err"); }
  };

  return (
    <>
      <PageHeader title={tr("delivery.title")} subtitle={tr("delivery.subtitle")}
        actions={<>
          <button className="btn" onClick={() => setCourierModal(true)}><UserPlus size={15} /> {tr("delivery.courier")}</button>
          <button className="btn btn-primary" onClick={() => setAssignModal(true)}><Truck size={15} /> {tr("delivery.assignDelivery")}</button>
        </>}
      />

      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-4">
        {[
          { label: tr("delivery.couriers"), value: String(couriers.length), color: "#8b5cf6", icon: "🧑‍💼" },
          { label: tr("delivery.activeDeliveries"), value: String(active.length), color: "#f97316", icon: "🚚" },
          { label: tr("delivery.deliveredToday"), value: String(todayDelivered.length), color: "#22c55e", icon: "✅" },
          { label: tr("delivery.awaiting"), value: String(orders.length), color: "#3b82f6", icon: "📦" },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: s.color }}>{s.icon} {s.value}</div>
          </Card>
        ))}
      </div>

      {/* Курьеры */}
      <div className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-3">
        {couriers.map((c, i) => (
          <Card key={c.id} delay={i * 0.04}>
            <div className="flex items-center gap-3">
              <Avatar name={c.name} color={c.avatarColor} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-xs muted">{c.phone} · {VEHICLES[c.vehicle] ?? c.vehicle}</div>
              </div>
              <Badge color={c.status === "available" ? "#22c55e" : c.status === "busy" ? "#f97316" : "#6b7280"}>
                {c.status === "available" ? "Свободен" : c.status === "busy" ? "Занят" : "Оффлайн"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
              <div className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                <div className="muted">{tr("delivery.active")}</div><div className="font-semibold mt-0.5">{c.activeDeliveries}</div>
              </div>
              <div className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                <div className="muted">{tr("delivery.today")}</div><div className="font-semibold mt-0.5">{c.completedToday}</div>
              </div>
              <div className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                <div className="muted">{tr("delivery.zone")}</div><div className="font-semibold mt-0.5 truncate">{c.zone}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={12} fill={j < c.rating ? "#f59e0b" : "transparent"} color={j < c.rating ? "#f59e0b" : "var(--muted)"} />
              ))}
            </div>
          </Card>
        ))}
        {couriers.length === 0 && <Card className="md:col-span-3"><p className="muted text-center py-8">Добавьте курьеров для начала работы</p></Card>}
      </div>

      {/* Доставки */}
      <Card hover={false} className="!p-0">
        <div className="card-pad pb-2 flex items-center gap-2"><MapPin size={16} color="var(--primary)" /><h3 className="font-semibold">{tr("delivery.feed")}</h3></div>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>{tr("nav.orders")}</th><th>{tr("common.customer")}</th><th>{tr("delivery.courier")}</th><th>{tr("delivery.address")}</th><th>{tr("common.amount")}</th><th>{tr("common.status")}</th><th>{tr("common.date")}</th><th /></tr></thead>
            <tbody>
              {deliveries.map((d) => {
                const st = D_STATUS[d.status] ?? D_STATUS.pending;
                return (
                  <tr key={d.id}>
                    <td className="font-semibold">{d.orderNumber}</td>
                    <td>{d.customerName}</td>
                    <td>{d.courierName}</td>
                    <td className="muted truncate max-w-[160px]">{d.city}, {d.address || "—"}</td>
                    <td className="font-semibold whitespace-nowrap">{money(d.orderTotal)}</td>
                    <td><Badge color={st.color}>{st.label}</Badge></td>
                    <td className="muted whitespace-nowrap">{dt(d.createdAt)}</td>
                    <td>
                      {d.status !== "delivered" && d.status !== "failed" && (
                        <button className="btn !py-1 !px-3" onClick={() => complete(d.id)}>
                          <CheckCircle2 size={13} /> {tr("delivery.delivered")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {deliveries.length === 0 && <tr><td colSpan={8} className="muted text-center py-8">Доставок пока нет — назначьте первую</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {assignModal && (
        <Modal open onClose={() => setAssignModal(false)} title="Назначить доставку" wide>
          <div className="grid md:grid-cols-2 gap-3.5">
            <select className="input" value={assignForm.orderId} onChange={(e) => {
              const o = orders.find((x) => x.id === Number(e.target.value));
              setAssignForm({ ...assignForm, orderId: e.target.value, address: "", city: o?.city ?? "Tashkent" });
            }}>
              <option value="">Выберите заказ</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.number} · {o.customer} · {money(o.total)}</option>)}
            </select>
            <select className="input" value={assignForm.courierId} onChange={(e) => setAssignForm({ ...assignForm, courierId: e.target.value })}>
              {couriers.filter((c) => c.status !== "offline").map((c) => <option key={c.id} value={c.id}>{c.name} · {VEHICLES[c.vehicle]} · {c.status === "available" ? "✅ свободен" : "🟡 занят"}</option>)}
            </select>
            <input className="input" placeholder="Адрес доставки" value={assignForm.address} onChange={(e) => setAssignForm({ ...assignForm, address: e.target.value })} />
            <input className="input" placeholder="Город" value={assignForm.city} onChange={(e) => setAssignForm({ ...assignForm, city: e.target.value })} />
            <textarea className="input md:col-span-2 min-h-20" placeholder="Комментарий для курьера" value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} />
          </div>
          <button className="btn btn-primary w-full justify-center mt-4" disabled={busy} onClick={assign}>{busy ? "Назначаем…" : "Назначить доставку"}</button>
        </Modal>
      )}

      {courierModal && (
        <Modal open onClose={() => setCourierModal(false)} title="Новый курьер">
          <div className="flex flex-col gap-3.5">
            <input className="input" placeholder="Имя и фамилия" value={courierForm.name} onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })} />
            <input className="input" placeholder="Телефон" value={courierForm.phone} onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })} />
            <select className="input" value={courierForm.vehicle} onChange={(e) => setCourierForm({ ...courierForm, vehicle: e.target.value })}>
              {Object.entries(VEHICLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" placeholder="Зона обслуживания" value={courierForm.zone} onChange={(e) => setCourierForm({ ...courierForm, zone: e.target.value })} />
            <button className="btn btn-primary justify-center" disabled={busy} onClick={addCr}>{busy ? "Сохраняем…" : "Добавить курьера"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
