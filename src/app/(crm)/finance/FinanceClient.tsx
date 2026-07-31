"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, PlusCircle } from "lucide-react";
import { Card, PageHeader, Badge, Modal } from "@/shared/ui/kit";
import { Lines, Donut, Legend } from "@/shared/ui/charts";
import { money, dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { StatIcon } from "@/shared/ui/StatIcon";
import { useT } from "@/shared/i18n/useT";

export interface Tx {
  id: number;
  kind: string;
  category: string;
  account: string;
  amount: string;
  note: string;
  createdAt: string;
}

const ACCOUNTS: Record<string, { label: string; color: string; icon: string }> = {
  cash: { label: "💵 Наличные (Касса)", color: "#f97316", icon: "💵" },
  click: { label: "🔵 Click", color: "#3b82f6", icon: "🔵" },
  payme: { label: "🟢 Payme", color: "#22c55e", icon: "🟢" },
  uzum: { label: "🟣 Uzum", color: "#8b5cf6", icon: "🟣" },
  bank: { label: "🏦 Банк (перевод)", color: "#14b8a6", icon: "🏦" },
};

const CATEGORY: Record<string, string> = {
  sales: "Продажи",
  logistics: "Логистика",
  marketing: "Маркетинг",
  salary: "Зарплата",
  production: "Производство",
  rent: "Аренда",
};

export function FinanceClient({ tx, income, expense, byAccount, byCategory, byDay }: {
  tx: Tx[];
  income: number;
  expense: number;
  byAccount: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  byDay: { day: string; income: number; expense: number }[];
}) {
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ kind: "income", category: "sales", account: "click", amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const tr = useT();
  const router = useRouter();
  const profit = income - expense;

  const create = async () => {
    setBusy(true);
    try {
      await postManage("addTransaction", { ...form, amount: Number(form.amount) });
      toast(`Операция на ${money(form.amount)} проведена`);
      setAdd(false);
      setForm({ kind: "income", category: "sales", account: "click", amount: "", note: "" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const exportCsv = () => {
    const rows = [
      ["Дата", "Тип", "Категория", "Счёт", "Сумма", "Комментарий"],
      ...tx.map((t) => [new Date(t.createdAt).toISOString(), t.kind, CATEGORY[t.category] ?? t.category, ACCOUNTS[t.account]?.label ?? t.account, t.amount, t.note]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "delis-finance.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Финансовый отчёт выгружен в CSV");
  };

  const stats = [
    { label: tr("finance.income"), value: compactMoney(income), color: "#22c55e", icon: "📥" },
    { label: tr("finance.expense"), value: compactMoney(expense), color: "#ef4444", icon: "📤" },
    { label: tr("finance.profit"), value: compactMoney(profit), color: "#8b5cf6", icon: "💜" },
    { label: tr("finance.profitability"), value: `${((profit / Math.max(income, 1)) * 100).toFixed(0)}%`, color: "#3b82f6", icon: "📊" },
    { label: tr("finance.operations"), value: String(tx.length), color: "#f97316", icon: "🧾" },
    { label: tr("finance.avgIncome"), value: compactMoney(income / Math.max(tx.filter((t) => t.kind === "income").length, 1)), color: "#14b8a6", icon: "🧮" },
  ];

  const cashIncome = tx.filter((t) => t.kind === "income" && t.account === "cash").reduce((s, t) => s + Number(t.amount), 0);
  const cashExpense = tx.filter((t) => t.kind === "expense" && t.account === "cash").reduce((s, t) => s + Number(t.amount), 0);
  const cashBalance = cashIncome - cashExpense;

  const addCashOp = (kind: string, note: string) => {
    setForm({ kind, category: kind === "income" ? "sales" : "logistics", account: "cash", amount: "", note });
    setAdd(true);
  };

  return (
    <>
      <PageHeader
        title={tr("finance.title")}
        subtitle={tr("finance.subtitle")}
        actions={
          <>
            <button className="btn" onClick={exportCsv}>
              <Download size={15} /> Экспорт XLSX
            </button>
            <button className="btn" onClick={() => addCashOp("income", "Приём наличных в кассу")}>
              💵 {tr("finance.cashIn")}
            </button>
            <button className="btn btn-primary" onClick={() => setAdd(true)}>
              <PlusCircle size={15} /> {tr("finance.newOperation")}
            </button>
          </>
        }
      />

      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-lg font-semibold mt-2" style={{ color: s.color }}>
              <StatIcon emoji={s.icon} size={16} color={s.color} />
              <span className="ml-2">{s.value}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Касса наличных */}
      <Card hover={false} className="!p-0 overflow-hidden">
        <div
          className="card-pad flex flex-wrap items-center justify-between gap-4"
          style={{ background: "linear-gradient(120deg, color-mix(in srgb, #f97316 10%, transparent), transparent)" }}
        >
          <div className="flex items-center gap-4">
            <StatIcon emoji="💵" size={24} color="#f97316" />
            <div>
              <div className="font-bold text-lg">
                {tr("finance.cashRegister")}: <span style={{ color: cashBalance >= 0 ? "var(--success)" : "var(--error)" }}>{money(cashBalance)}</span>
              </div>
              <div className="text-xs muted">
                {tr("finance.received")} {money(cashIncome)} · {tr("finance.issued")} {money(cashExpense)}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => addCashOp("income", "Приём наличных от клиента")}>
              💵 {tr("finance.receive")}
            </button>
            <button className="btn" onClick={() => addCashOp("expense", "Выдача наличных / инкассация")}>
              💸 {tr("finance.issue")}
            </button>
            <button className="btn" onClick={() => addCashOp("expense", "Инкассация: перевод наличных в банк")}>
              🏦 {tr("finance.collection")}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-3">{tr("finance.cashFlow")}</h3>
          <Lines
            data={byDay}
            keys={[
              { key: "income", name: "Доход", color: "#22c55e" },
              { key: "expense", name: "Расход", color: "#ef4444" },
            ]}
            height={300}
          />
        </Card>
        <Card>
          <h3 className="font-semibold mb-2">{tr("finance.byPaymentSystems")}</h3>
          <Donut data={byAccount.map((a) => ({ name: ACCOUNTS[a.name]?.label ?? a.name, value: a.value }))} />
          <Legend data={byAccount.map((a) => ({ name: ACCOUNTS[a.name]?.label ?? a.name, value: a.value }))} />
        </Card>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card>
          <h3 className="font-semibold mb-2">{tr("finance.expenseStructure")}</h3>
          <Donut data={byCategory.map((c) => ({ name: CATEGORY[c.name] ?? c.name, value: c.value }))} />
          <Legend data={byCategory.map((c) => ({ name: CATEGORY[c.name] ?? c.name, value: c.value }))} />
        </Card>

        <Card hover={false} className="xl:col-span-2 !p-0">
          <h3 className="font-semibold card-pad pb-2">{tr("finance.operationHistory")}</h3>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table>
              <thead>
                <tr>
                  <th>{tr("common.status")}</th>
                  <th>{tr("finance.account")}</th>
                  <th>{tr("common.amount")}</th>
                  <th className="hidden md:table-cell">Комментарий</th>
                  <th>{tr("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Badge color={t.kind === "income" ? "#22c55e" : "#ef4444"}>{t.kind === "income" ? "Доход" : "Расход"}</Badge>
                    </td>
                    <td>
                      <Badge color={ACCOUNTS[t.account]?.color ?? "#8b5cf6"}>{ACCOUNTS[t.account]?.label ?? t.account}</Badge>
                    </td>
                    <td className="font-semibold whitespace-nowrap" style={{ color: t.kind === "income" ? "var(--success)" : "var(--error)" }}>
                      {t.kind === "income" ? "+" : "−"}
                      {money(t.amount)}
                    </td>
                    <td className="muted truncate max-w-[220px] hidden md:table-cell">{t.note}</td>
                    <td className="muted whitespace-nowrap">{dt(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {add && (
        <Modal open onClose={() => setAdd(false)} title="Новая финансовая операция">
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn justify-center"
                style={form.kind === "income" ? { background: "linear-gradient(120deg,#22c55e,#14b8a6)", color: "#fff", borderColor: "transparent" } : {}}
                onClick={() => setForm({ ...form, kind: "income" })}
              >
                Доход
              </button>
              <button
                className="btn justify-center"
                style={form.kind === "expense" ? { background: "linear-gradient(120deg,#ef4444,#f97316)", color: "#fff", borderColor: "transparent" } : {}}
                onClick={() => setForm({ ...form, kind: "expense" })}
              >
                Расход
              </button>
            </div>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select className="input" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
              {Object.entries(ACCOUNTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <input className="input" type="number" placeholder="Сумма (сум)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input className="input" placeholder="Комментарий" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="btn btn-primary justify-center" disabled={busy || !Number(form.amount)} onClick={create}>
              {busy ? "Проводим…" : "Провести операцию"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function compactMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} тыс`;
  return money(n);
}
