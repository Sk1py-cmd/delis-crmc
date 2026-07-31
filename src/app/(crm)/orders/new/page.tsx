import { getCustomers, getProducts } from "@/server/queries";
import { NewOrderForm } from "./NewOrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [customers, products] = await Promise.all([getCustomers(), getProducts()]);
  return (
    <NewOrderForm
      customers={customers.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, city: c.city, phone: c.phone, isVip: c.isVip }))}
      products={products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), cost: Number(p.cost), stock: p.stock, image: p.image, volume: p.volume }))}
    />
  );
}
