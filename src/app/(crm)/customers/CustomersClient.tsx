"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Download } from "lucide-react";
import { Card, PageHeader, Badge, Tabs, Avatar } from "@/shared/ui/kit";
import { StatGrid } from "@/widgets/StatCard";
import { money, dt, SOURCE_LABEL } from "@/shared/lib/format";
import { exportXLSX } from "@/shared/lib/excel";
import { useT } from "@/shared/i18n/useT";

export interface CustomerLite {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  telegramId: string;
  phone: string;
  city: string;
  source: string;
  isVip: boolean;
  bonus: number;
  ordersCount: number;
  totalSpent: string;
  createdAt: string;
  lastActiveAt: string;
}

export function CustomersClient({ customers }: { customers: CustomerLite[] }) {
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const tr = useT();

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          (src === "all" || (src === "vip" ? c.isVip : c.source === src)) &&
          (q === "" || `${c.firstName} ${c.lastName} ${c.username} ${c.phone} ${c.city}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [customers, q, src],
  );

  const revenue = customers.reduce((a, c) => a + Number(c.totalSpent), 0);

  const exportXlsx = () => {
    const headers = ["Имя", "Фамилия", "Username", "Telegram ID", "Телефон", "Город", "Источник", "VIP", "Бонусы", "Заказов", "Сумма покупок", "Регистрация", "Последняя активность"];
    const rows = filtered.map((c) => [
      c.firstName,
      c.lastName,
      c.username,
      c.telegramId,
      c.phone,
      c.city,
      SOURCE_LABEL[c.source] ?? c.source,
      c.isVip ? "Да" : "Нет",
      String(c.bonus),
      String(c.ordersCount),
      c.totalSpent,
      dt(c.createdAt),
      dt(c.lastActiveAt),
    ]);
    exportXLSX(headers, rows, `delis-customers-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <>
      <PageHeader
        title={tr("customers.title")}
        subtitle={tr("customers.subtitle")}
        actions={
          <button className="btn" onClick={exportXlsx}>
            <Download size={15} /> {tr("orders.exportXlsx")}
          </button>
        }
      />

      <StatGrid
        stats={[
          { label: tr("customers.total"), value: customers.length, color: "#8b5cf6", icon: "👥", mode: "num" },
          { label: tr("customers.vip"), value: customers.filter((c) => c.isVip).length, color: "#f59e0b", icon: "⭐", mode: "num" },
          { label: tr("customers.revenue"), value: revenue, color: "#22c55e", icon: "💰" },
          { label: tr("customers.avgLtv"), value: revenue / Math.max(customers.length, 1), color: "#3b82f6", icon: "📊" },
          { label: tr("customers.fromTelegram"), value: customers.filter((c) => c.source === "telegram" || c.source === "miniapp").length, color: "#0ea5e9", icon: "✈️", mode: "num" },
          { label: tr("customers.bonuses"), value: customers.reduce((a, c) => a + c.bonus, 0), color: "#ec4899", icon: "🎁" },
        ]}
      />

      <Card hover={false} className="flex flex-wrap items-center gap-3">
        <Tabs
          value={src}
          onChange={setSrc}
          items={[{ key: "all", label: tr("common.all") }, { key: "vip", label: tr("customers.vip") }, ...Object.entries(SOURCE_LABEL).map(([k, v]) => ({ key: k, label: v }))]}
        />
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
          <input className="input !pl-9" placeholder={tr("customers.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-[var(--gap)] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.3) }}
            whileHover={{ y: -4 }}
          >
            <Link href={`/customers/${c.id}`} className="glass card-pad block h-full">
              <div className="flex items-center gap-3">
                <Avatar name={`${c.firstName} ${c.lastName}`} color={c.isVip ? "#f59e0b" : "var(--primary)"} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs muted truncate">
                    @{c.username} · ID {c.telegramId}
                  </div>
                </div>
                {c.isVip && <Badge color="#f59e0b">VIP</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                  <div className="muted">{tr("customers.ordersCount")}</div>
                  <div className="font-semibold text-sm mt-0.5">{c.ordersCount}</div>
                </div>
                <div className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                  <div className="muted">{tr("customers.totalSpent")}</div>
                  <div className="font-semibold text-sm mt-0.5">{money(c.totalSpent)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs muted">
                <span>
                  {c.city} · {SOURCE_LABEL[c.source] ?? c.source}
                </span>
                <span>{dt(c.lastActiveAt)}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  );
}
