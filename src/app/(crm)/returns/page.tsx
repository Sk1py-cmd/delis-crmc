import { getReturnsData, recentOrdersList } from "@/server/queries";
import { ReturnsClient } from "./ReturnsClient";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const [returns, orders] = await Promise.all([getReturnsData(), recentOrdersList(50)]);
  return (
    <ReturnsClient
      returns={returns.map((r) => ({
        id: r.id, orderId: r.orderId, orderNumber: r.orderNumber, customerName: r.customerName,
        reason: r.reason, status: r.status, refundAmount: String(r.refundAmount),
        restockItems: r.restockItems, notes: r.notes, createdBy: r.createdBy, createdAt: String(r.createdAt),
      }))}
      orders={orders.map((o) => ({ id: o.id, number: o.number, customer: o.customer ?? "", total: o.total }))}
    />
  );
}
