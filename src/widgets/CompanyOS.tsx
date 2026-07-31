"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bot,
  Globe,
  Smartphone,
  Warehouse,
  Wallet,
  Users,
  Megaphone,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  PackagePlus,
  ClipboardList,
} from "lucide-react";
import { Card, Badge, Progress, Modal } from "@/shared/ui/kit";
import { dt, money } from "@/shared/lib/format";
import { postManage } from "@/shared/lib/manage";
import { useToast } from "@/shared/ui/Toast";

export interface ModuleStatus {
  key: string;
  label: string;
  status: string;
  latency: number;
  color: string;
  items: number;
}

export interface SyncEventLite {
  id: number;
  source: string;
  target: string;
  entity: string;
  action: string;
  status: string;
  payload: Record<string, string | number | boolean>;
  createdAt: string;
}

const ICONS: Record<string, typeof Activity> = {
  crm: Activity,
  telegram_bot: Bot,
  miniapp: Smartphone,
  website: Globe,
  warehouse: Warehouse,
  finance: Wallet,
  agents: Users,
  marketing: Megaphone,
};

const ACTIONS = [
  { key: "sync", title: "Синхронизировать всё", desc: "CRM → Bot → Mini App → Site → Warehouse", icon: RefreshCw, color: "#8b5cf6" },
  { key: "order", title: "Новый заказ", desc: "Создать заказ вручную", icon: Plus, color: "#3b82f6" },
  { key: "product", title: "Новый товар", desc: "Добавить SKU в PIM", icon: PackagePlus, color: "#22c55e" },
  { key: "marketing", title: "Маркетинг / Акция", desc: "Промокоды и автоворонки", icon: Megaphone, color: "#a855f7" },
  { key: "broadcast", title: "Рассылка", desc: "Запустить кампанию", icon: Send, color: "#ec4899" },
  { key: "inventory", title: "Инвентаризация", desc: "Сверить остатки", icon: ClipboardList, color: "#f97316" },
  { key: "finance", title: "Операция", desc: "Доход/расход", icon: Wallet, color: "#14b8a6" },
];

const ACTION_LABEL: Record<string, string> = {
  customer_registered: "Новый клиент",
  stock_reserved: "Резерв склада",
  price_updated: "Цена обновлена",
  banner_published: "Баннер опубликован",
  payment_confirmed: "Платёж подтверждён",
  manual_full_sync: "Полная синхронизация",
  order_status_changed: "Статус заказа",
  customer_order_updated: "Обновление заказа клиента",
  message_sent: "Сообщение отправлено",
  message_received: "Сообщение получено",
  product_updated: "Товар обновлён",
  product_created: "Товар создан",
  catalog_updated: "Каталог обновлён",
  stock_changed: "Склад изменён",
  availability_updated: "Доступность обновлена",
  order_created: "Заказ создан",
  revenue_planned: "Финансы обновлены",
  notification_sent: "Уведомление отправлено",
};

function moduleValue(m: ModuleStatus) {
  if (m.key === "finance") return money(m.items);
  if (m.key === "warehouse" && m.items > 0) return `${m.items} low`;
  if (m.key === "telegram_bot") return `${m.items} unread`;
  return String(m.items);
}

export function CompanyOS({ modules, sync }: { modules: ModuleStatus[]; sync: SyncEventLite[] }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  const synced = modules.filter((m) => m.status === "online").length;
  const health = Math.round((synced / modules.length) * 100);

  const doAction = async (key: string) => {
    if (key === "order") return router.push("/orders/new");
    if (key === "product") return router.push("/products");
    if (key === "marketing") return router.push("/marketing");
    if (key === "broadcast") return router.push("/broadcast");
    if (key === "inventory") return router.push("/warehouse");
    if (key === "finance") return router.push("/finance");
    if (key === "sync") {
      setBusy(true);
      try {
        await postManage("syncEverything");
        toast("Все системы DELIS синхронизированы");
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Ошибка синхронизации", "err");
      }
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-[var(--gap)] xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="relative overflow-hidden" hover={false}>
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 chip mb-3" style={{ color: "var(--success)", borderColor: "color-mix(in srgb, var(--success) 35%, transparent)" }}>
              <Zap size={13} /> Company OS Online
            </div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Единая экосистема DELIS</h2>
            <p className="muted text-sm mt-1 max-w-2xl">
              CRM, Telegram Bot, Mini App, сайт, склад, финансы, агенты и маркетинг работают как один продукт с общей базой данных.
            </p>
          </div>
          <div className="min-w-[180px]">
            <div className="flex justify-between text-xs muted mb-1.5">
              <span>Health score</span>
              <span>{health}%</span>
            </div>
            <Progress value={health} color={health >= 95 ? "#22c55e" : "#f97316"} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {modules.map((m, i) => {
            const Icon = ICONS[m.key] ?? Activity;
            const attention = m.status !== "online";
            return (
              <motion.button
                key={m.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => setOpen(m.key)}
                className="rounded-3xl p-4 text-left"
                style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl grid place-items-center" style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)`, color: m.color }}>
                    <Icon size={18} />
                  </div>
                  {attention ? <AlertTriangle size={16} color="#f97316" /> : <CheckCircle2 size={16} color="#22c55e" />}
                </div>
                <div className="font-medium text-sm truncate">{m.label}</div>
                <div className="flex items-center justify-between mt-2 text-xs muted">
                  <span>{m.latency} ms</span>
                  <span>{moduleValue(m)}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-5 relative">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <motion.button
                key={a.key}
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                className="flex items-center gap-3 rounded-2xl p-3 text-left"
                style={{ background: "rgba(var(--surface),0.5)", border: "1px solid rgba(var(--border))" }}
                onClick={() => doAction(a.key)}
                disabled={busy && a.key === "sync"}
              >
                <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${a.color} 18%, transparent)`, color: a.color }}>
                  <Icon size={16} className={busy && a.key === "sync" ? "animate-spin" : ""} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{busy && a.key === "sync" ? "Синхронизируем…" : a.title}</span>
                  <span className="block text-xs muted truncate">{a.desc}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </Card>

      <Card hover={false}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Sync Timeline</h3>
            <p className="muted text-xs">Живая лента всех систем</p>
          </div>
          <Badge color="#22c55e">Live</Badge>
        </div>
        <div className="flex flex-col gap-3 max-h-[470px] overflow-y-auto pr-1">
          {sync.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }} className="flex gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: e.status === "synced" ? "var(--success)" : "var(--warning)" }} />
              <div className="min-w-0 flex-1">
                <div className="text-[0.82rem] font-medium truncate">{ACTION_LABEL[e.action] ?? e.action}</div>
                <div className="text-xs muted truncate">
                  {e.source} → {e.target} · {e.entity}
                </div>
                <div className="text-[0.68rem] muted">{dt(e.createdAt)}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {open && (
          <Modal open onClose={() => setOpen(null)} title={modules.find((m) => m.key === open)?.label ?? "Модуль"}>
            {(() => {
              const m = modules.find((x) => x.key === open);
              if (!m) return null;
              const Icon = ICONS[m.key] ?? Activity;
              return (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl grid place-items-center" style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)`, color: m.color }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-xs muted">Статус: {m.status} · задержка {m.latency} ms</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
                      <div className="text-xs muted">Объекты</div>
                      <div className="font-semibold mt-1">{moduleValue(m)}</div>
                    </div>
                    <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
                      <div className="text-xs muted">Состояние</div>
                      <div className="font-semibold mt-1" style={{ color: m.status === "online" ? "var(--success)" : "var(--warning)" }}>
                        {m.status === "online" ? "Синхронизирован" : "Требует внимания"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary w-full justify-center mt-4"
                    onClick={() => {
                      setOpen(null);
                      void doAction("sync");
                    }}
                  >
                    Синхронизировать модуль
                  </button>
                </div>
              );
            })()}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
