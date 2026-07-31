"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Mail, Smartphone, BellRing, Inbox, CheckCheck, PlusCircle } from "lucide-react";
import { Card, PageHeader, Badge, Tabs, Modal } from "@/shared/ui/kit";
import { StatGrid } from "@/widgets/StatCard";
import { dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { useT } from "@/shared/i18n/useT";

export interface NotifItem {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  color: string;
  at: string;
}

const CHANNEL: Record<string, { label: string; icon: typeof Send; color: string }> = {
  telegram: { label: "Telegram", icon: Send, color: "#0ea5e9" },
  email: { label: "Email", icon: Mail, color: "#3b82f6" },
  push: { label: "Push", icon: Smartphone, color: "#8b5cf6" },
  sms: { label: "SMS", icon: BellRing, color: "#f97316" },
  internal: { label: "Внутреннее", icon: Inbox, color: "#14b8a6" },
};

const STATUS: Record<string, { label: string; color: string }> = {
  delivered: { label: "Доставлено", color: "#22c55e" },
  sent: { label: "Отправлено", color: "#3b82f6" },
  read: { label: "Прочитано", color: "#8b5cf6" },
  queued: { label: "В очереди", color: "#f97316" },
};

export function NotificationsClient({ items }: { items: NotifItem[] }) {
  const [filter, setFilter] = useState("all");
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", channel: "telegram" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const tr = useT();
  const router = useRouter();

  const filtered = items.filter((i) => filter === "all" || i.channel === filter);

  const submit = async () => {
    setBusy(true);
    try {
      await postManage("notify", form);
      toast(`Уведомление отправлено через ${CHANNEL[form.channel]?.label ?? form.channel}`);
      setCreate(false);
      setForm({ title: "", body: "", channel: "telegram" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  return (
    <>
      <PageHeader
        title={tr("notifications.title")}
        subtitle={tr("notifications.subtitle")}
        actions={
          <button className="btn btn-primary" onClick={() => setCreate(true)}>
            <PlusCircle size={15} /> {tr("notifications.create")}
          </button>
        }
      />

      <StatGrid
        stats={[
          { label: tr("notifications.sentToday"), value: 128, color: "#8b5cf6", icon: "📨", mode: "num" },
          { label: tr("notifications.deliveryRate"), value: 98.2, suffix: "%", color: "#22c55e", icon: "✅", mode: "num" },
          { label: "Telegram", value: 64, color: "#0ea5e9", icon: "✈️", mode: "num" },
          { label: "Push", value: 41, color: "#ec4899", icon: "📱", mode: "num" },
          { label: "Email", value: 18, color: "#3b82f6", icon: "📧", mode: "num" },
          { label: tr("notifications.inQueue"), value: 5, color: "#f97316", icon: "⏳", mode: "num" },
        ]}
      />

      <Card hover={false} className="flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[{ key: "all", label: tr("common.all") }, ...Object.entries(CHANNEL).map(([k, v]) => ({ key: k, label: v.label }))]}
        />
        <span className="muted text-xs ml-auto">
          История синхронизируется с Bot, Mini App и сайтом автоматически
        </span>
      </Card>

      <Card hover={false} className="!p-0">
        <div className="p-3 flex flex-col gap-2">
          {filtered.map((n, i) => {
            const ch = CHANNEL[n.channel] ?? CHANNEL.internal;
            const st = STATUS[n.status] ?? STATUS.sent;
            const Icon = ch.icon;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                whileHover={{ x: 4 }}
                className="flex items-center gap-4 rounded-2xl p-3.5"
                style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
              >
                <div
                  className="w-11 h-11 rounded-2xl grid place-items-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${ch.color} 18%, transparent)`, color: ch.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs muted truncate">{n.body}</div>
                </div>
                <Badge color={ch.color}>{ch.label}</Badge>
                <Badge color={st.color}>
                  <CheckCheck size={11} /> {st.label}
                </Badge>
                <span className="muted text-xs whitespace-nowrap hidden md:block">{dt(n.at)}</span>
              </motion.div>
            );
          })}
          {filtered.length === 0 && <div className="muted text-sm text-center py-10">{tr("notifications.noneInChannel")}</div>}
        </div>
      </Card>

      {create && (
        <Modal open onClose={() => setCreate(false)} title="Новое уведомление">
          <div className="flex flex-col gap-3.5">
            <input className="input" placeholder="Заголовок (например: Акция недели)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="input min-h-24" placeholder="Текст уведомления" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <select className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {Object.entries(CHANNEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <button className="btn btn-primary justify-center" disabled={busy || !form.title.trim()} onClick={submit}>
              {busy ? (
                "Отправляем…"
              ) : (
                <>
                  <Send size={15} /> Отправить
                </>
              )}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
