import { getPnLReport } from "@/server/queries";
import { requireAccess } from "@/server/guard";
import { PnLClient } from "./PnLClient";

export const dynamic = "force-dynamic";

export default async function PnLPage() {
  await requireAccess("/pnl");
  const d = await getPnLReport();
  return (
    <PnLClient
      byCategory={d.byCategory.map((c) => ({ category: c.category, revenue: Number(c.revenue), cost: Number(c.cost), units: Number(c.units) }))}
      byChannel={d.byChannel.map((c) => ({ channel: c.channel, revenue: Number(c.revenue), profit: Number(c.profit), orders: Number(c.orders) }))}
      byMonth={d.byMonth.map((m) => ({ month: m.month, revenue: Number(m.revenue), profit: Number(m.profit) }))}
      expenses={{
        total: Number(d.expenses.total), logistics: Number(d.expenses.logistics),
        marketing: Number(d.expenses.marketing), salary: Number(d.expenses.salary),
        production: Number(d.expenses.production), rent: Number(d.expenses.rent),
      }}
      topProducts={d.topProducts.map((p) => ({ name: p.name, revenue: Number(p.revenue), profit: Number(p.profit), units: Number(p.units) }))}
    />
  );
}
