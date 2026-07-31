import { recentOrdersList, init } from "@/server/queries";
import { OrdersClient } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await init();
  const orders = await recentOrdersList(200);
  return <OrdersClient orders={orders} />;
}
