"use client";

import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { Card, PageHeader, Badge, Progress } from "@/shared/ui/kit";
import { Lines, Donut, Legend, Bars } from "@/shared/ui/charts";
import { money, compact } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { exportXLSX } from "@/shared/lib/excel";
import { SOURCE_LABEL } from "@/shared/lib/format";
import { useT } from "@/shared/i18n/useT";

interface Props {
  byCategory: { category: string; revenue: number; cost: number; units: number }[];
  byChannel: { channel: string; revenue: number; profit: number; orders: number }[];
  byMonth: { month: string; revenue: number; profit: number }[];
  expenses: { total: number; logistics: number; marketing: number; salary: number; production: number; rent: number };
  topProducts: { name: string; revenue: number; profit: number; units: number }[];
}

const EXPENSE_LABELS: Record<string, string> = {
  logistics: "Логистика", marketing: "Маркетинг", salary: "Зарплата",
  production: "Производство", rent: "Аренда",
};

export function PnLClient({ byCategory, byChannel, byMonth, expenses, topProducts }: Props) {
  const toast = useToast();
  const tr = useT();

  const revenue = byCategory.reduce((s, c) => s + c.revenue, 0);
  const cogs = byCategory.reduce((s, c) => s + c.cost, 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses.total;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const exportReport = () => {
    const headers = ["Показатель", "Сумма (сум)", "% от выручки"];
    const rows: (string | number)[][] = [
      ["Выручка (Revenue)", revenue, "100%"],
      ["Себестоимость (COGS)", -cogs, `${((cogs / Math.max(revenue, 1)) * 100).toFixed(1)}%`],
      ["Валовая прибыль (Gross Profit)", grossProfit, `${grossMargin.toFixed(1)}%`],
      ["", "", ""],
      ["ОПЕРАЦИОННЫЕ РАСХОДЫ", "", ""],
      ...Object.entries(EXPENSE_LABELS).map(([k, label]) => [
        label, -(expenses[k as keyof typeof expenses] as number),
        `${(((expenses[k as keyof typeof expenses] as number) / Math.max(revenue, 1)) * 100).toFixed(1)}%`,
      ]),
      ["Итого расходов", -expenses.total, `${((expenses.total / Math.max(revenue, 1)) * 100).toFixed(1)}%`],
      ["", "", ""],
      ["ЧИСТАЯ ПРИБЫЛЬ (Net Profit)", netProfit, `${netMargin.toFixed(1)}%`],
      ["", "", ""],
      ["ПО КАТЕГОРИЯМ", "", ""],
      ...byCategory.map((c) => [c.category, c.revenue - c.cost, `${(((c.revenue - c.cost) / Math.max(c.revenue, 1)) * 100).toFixed(1)}%`]),
    ];
    exportXLSX(headers, rows, `delis-pnl-${new Date().toISOString().slice(0, 10)}`);
    toast("P&L отчёт выгружен в Excel");
  };

  const catData = byCategory.map((c) => ({
    name: c.category, revenue: c.revenue, profit: c.revenue - c.cost,
    margin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
  })).sort((a, b) => b.profit - a.profit);

  const expenseData = Object.entries(EXPENSE_LABELS).map(([k, label]) => ({
    name: label, value: expenses[k as keyof typeof expenses] as number,
  })).filter((e) => e.value > 0);

  return (
    <>
      <PageHeader
        title={tr("pnl.title")}
        subtitle={tr("pnl.subtitle")}
        actions={<button className="btn btn-primary" onClick={exportReport}><Download size={15} /> {tr("pnl.exportExcel")}</button>}
      />

      {/* Главные показатели */}
      <div className="grid gap-[var(--gap)] grid-cols-2 lg:grid-cols-5">
        {[
          { label: tr("pnl.revenue"), value: compact(revenue), color: "#8b5cf6", icon: "💰", sub: "100%" },
          { label: tr("pnl.cogs"), value: compact(cogs), color: "#f97316", icon: "📦", sub: `${((cogs / Math.max(revenue, 1)) * 100).toFixed(0)}%` },
          { label: tr("pnl.grossProfit"), value: compact(grossProfit), color: "#22c55e", icon: "📈", sub: `${grossMargin.toFixed(1)}%` },
          { label: tr("pnl.expenses"), value: compact(expenses.total), color: "#ef4444", icon: "💸", sub: `${((expenses.total / Math.max(revenue, 1)) * 100).toFixed(0)}%` },
          { label: tr("pnl.netProfit"), value: compact(netProfit), color: netProfit >= 0 ? "#22c55e" : "#ef4444", icon: netProfit >= 0 ? "🎯" : "⚠️", sub: `${netMargin.toFixed(1)}%` },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.7rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-lg font-bold mt-2" style={{ color: s.color }}>{s.icon} {s.value}</div>
            <div className="text-xs muted mt-1">{s.sub} от выручки</div>
          </Card>
        ))}
      </div>

      {/* P&L Waterfall таблица */}
      <Card hover={false} className="!p-0">
        <div className="card-pad pb-2">
          <h3 className="font-semibold">Структура прибыли (P&amp;L Statement)</h3>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>{tr("pnl.indicator")}</th><th>{tr("common.amount")}</th><th>{tr("pnl.percentOfRevenue")}</th><th>{tr("pnl.visualization")}</th></tr></thead>
            <tbody>
              <tr style={{ background: "color-mix(in srgb, #8b5cf6 8%, transparent)" }}>
                <td className="font-bold">Выручка (Revenue)</td>
                <td className="font-bold" style={{ color: "#8b5cf6" }}>{money(revenue)}</td>
                <td>100%</td>
                <td><Progress value={100} color="#8b5cf6" /></td>
              </tr>
              <tr>
                <td className="pl-6 muted">− Себестоимость товаров (COGS)</td>
                <td style={{ color: "var(--error)" }}>−{money(cogs)}</td>
                <td className="muted">{((cogs / Math.max(revenue, 1)) * 100).toFixed(1)}%</td>
                <td><Progress value={(cogs / Math.max(revenue, 1)) * 100} color="#f97316" /></td>
              </tr>
              <tr style={{ background: "color-mix(in srgb, #22c55e 8%, transparent)" }}>
                <td className="font-bold">= Валовая прибыль</td>
                <td className="font-bold" style={{ color: "var(--success)" }}>{money(grossProfit)}</td>
                <td className="font-semibold">{grossMargin.toFixed(1)}%</td>
                <td><Progress value={grossMargin} color="#22c55e" /></td>
              </tr>
              {Object.entries(EXPENSE_LABELS).map(([k, label]) => {
                const v = expenses[k as keyof typeof expenses] as number;
                if (v === 0) return null;
                return (
                  <tr key={k}>
                    <td className="pl-6 muted">− {label}</td>
                    <td style={{ color: "var(--error)" }}>−{money(v)}</td>
                    <td className="muted">{((v / Math.max(revenue, 1)) * 100).toFixed(1)}%</td>
                    <td><Progress value={(v / Math.max(revenue, 1)) * 100} color="#ef4444" /></td>
                  </tr>
                );
              })}
              <tr style={{ background: netProfit >= 0 ? "color-mix(in srgb, #22c55e 12%, transparent)" : "color-mix(in srgb, #ef4444 12%, transparent)" }}>
                <td className="font-bold text-base">= ЧИСТАЯ ПРИБЫЛЬ</td>
                <td className="font-bold text-base" style={{ color: netProfit >= 0 ? "var(--success)" : "var(--error)" }}>{money(netProfit)}</td>
                <td className="font-bold">{netMargin.toFixed(1)}%</td>
                <td>
                  <Badge color={netProfit >= 0 ? "#22c55e" : "#ef4444"}>
                    {netProfit >= 0 ? <><TrendingUp size={11} /> Прибыль</> : <><TrendingDown size={11} /> Убыток</>}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-3">{tr("pnl.byMonths")}</h3>
          <Lines data={byMonth.map((m) => ({ day: m.month, revenue: m.revenue, profit: m.profit }))}
            keys={[{ key: "revenue", name: "Выручка", color: "#8b5cf6" }, { key: "profit", name: "Прибыль", color: "#22c55e" }]} height={280} />
        </Card>
        <Card>
          <h3 className="font-semibold mb-2">Структура расходов</h3>
          <Donut data={expenseData} />
          <Legend data={expenseData} />
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-2">
        <Card hover={false} className="!p-0">
          <div className="card-pad pb-2"><h3 className="font-semibold">{tr("pnl.byCategories")}</h3></div>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Категория</th><th>Выручка</th><th>Прибыль</th><th>Маржа</th></tr></thead>
              <tbody>
                {catData.map((c) => (
                  <tr key={c.name}>
                    <td className="font-medium">{c.name}</td>
                    <td>{money(c.revenue)}</td>
                    <td style={{ color: "var(--success)" }} className="font-semibold">{money(c.profit)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16"><Progress value={c.margin} color={c.margin >= 40 ? "#22c55e" : c.margin >= 25 ? "#f97316" : "#ef4444"} /></div>
                        <span className="text-xs font-semibold">{c.margin.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card hover={false} className="!p-0">
          <div className="card-pad pb-2"><h3 className="font-semibold">{tr("pnl.byChannels")}</h3></div>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Канал</th><th>Заказов</th><th>Выручка</th><th>Прибыль</th></tr></thead>
              <tbody>
                {byChannel.sort((a, b) => b.profit - a.profit).map((c) => (
                  <tr key={c.channel}>
                    <td className="font-medium">{SOURCE_LABEL[c.channel] ?? c.channel}</td>
                    <td>{c.orders}</td>
                    <td>{money(c.revenue)}</td>
                    <td style={{ color: "var(--success)" }} className="font-semibold">{money(c.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold mb-3">{tr("pnl.topProducts")}</h3>
        <Bars data={topProducts.slice(0, 10).map((p) => ({ name: p.name.replace("DELIS ", "").split(" ").slice(0, 2).join(" "), value: p.profit }))} color="#22c55e" height={280} />
      </Card>
    </>
  );
}
