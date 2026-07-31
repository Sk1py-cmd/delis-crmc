import { getFinance } from "@/server/queries";
import { requireAccess } from "@/server/guard";
import { FinanceClient } from "./FinanceClient";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  await requireAccess("/finance");
  const f = await getFinance();
  return (
    <FinanceClient
      tx={f.tx.map((t) => ({ ...t, createdAt: String(t.createdAt) }))}
      income={Number(f.agg.income)}
      expense={Number(f.agg.expense)}
      byAccount={f.byAccount.map((a) => ({ name: a.name, value: Number(a.value) }))}
      byCategory={f.byCategory.map((c) => ({ name: c.name, value: Number(c.value) }))}
      byDay={f.byDay.map((d) => ({ day: d.day, income: Number(d.income), expense: Number(d.expense) }))}
    />
  );
}
