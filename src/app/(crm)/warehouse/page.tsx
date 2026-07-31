import { getWarehouse } from "@/server/queries";
import { WarehouseClient } from "./WarehouseClient";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const { products, moves } = await getWarehouse();
  return <WarehouseClient products={products} moves={moves.map((m) => ({ ...m, createdAt: String(m.createdAt) }))} />;
}
