import { recentOrdersList, init } from "@/server/queries";
import { OrdersClient } from "./OrdersClient";
import { requireAccess } from "@/server/guard";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requireAccess("/orders");
  await init();
  const orders = await recentOrdersList(200);
  return <OrdersClient orders={orders} />;
}
