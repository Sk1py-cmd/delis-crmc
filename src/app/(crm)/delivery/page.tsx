import { getDeliveryData, recentOrdersList } from "@/server/queries";
import { DeliveryClient } from "./DeliveryClient";

export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const [data, orders] = await Promise.all([getDeliveryData(), recentOrdersList(30)]);
  return (
    <DeliveryClient
      couriers={data.couriers.map((c) => ({
        id: c.id, name: c.name, phone: c.phone, vehicle: c.vehicle, zone: c.zone,
        status: c.status, activeDeliveries: c.activeDeliveries, completedToday: c.completedToday,
        rating: c.rating, avatarColor: c.avatarColor,
      }))}
      deliveries={data.deliveries.map((d) => ({
        id: d.id, orderId: d.orderId, orderNumber: d.orderNumber, orderTotal: d.orderTotal,
        courierId: d.courierId, courierName: d.courierName, customerName: d.customerName,
        status: d.status, address: d.address, city: d.city,
        scheduledAt: d.scheduledAt ? String(d.scheduledAt) : null,
        deliveredAt: d.deliveredAt ? String(d.deliveredAt) : null,
        createdAt: String(d.createdAt),
      }))}
      orders={orders.filter((o) => ["packed", "paid", "processing", "confirmed"].includes(o.status)).map((o) => ({
        id: o.id, number: o.number, customer: o.customer ?? "", city: o.city ?? "Tashkent", total: o.total,
      }))}
    />
  );
}
