import { getWarehouse } from "@/server/queries";
import { WarehouseClient } from "./WarehouseClient";
import { requireAccess } from "@/server/guard";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  await requireAccess("/warehouse");
  const { products, moves } = await getWarehouse();
  return <WarehouseClient products={products} moves={moves.map((m) => ({ ...m, createdAt: String(m.createdAt) }))} />;
}
