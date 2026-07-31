import { getCustomers } from "@/server/queries";
import { CustomersClient } from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const rows = await getCustomers();
  return (
    <CustomersClient
      customers={rows.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        username: c.username,
        telegramId: c.telegramId,
        phone: c.phone,
        city: c.city,
        source: c.source,
        isVip: c.isVip,
        bonus: c.bonus,
        ordersCount: c.ordersCount,
        totalSpent: c.totalSpent,
        createdAt: String(c.createdAt),
        lastActiveAt: String(c.lastActiveAt),
      }))}
    />
  );
}
