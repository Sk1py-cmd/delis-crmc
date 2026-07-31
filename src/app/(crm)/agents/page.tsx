import { getAgents, getAgentVisits, getProducts } from "@/server/queries";
import { AgentsClient } from "./AgentsClient";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const [rows, visits, products] = await Promise.all([
    getAgents(),
    getAgentVisits(),
    getProducts(),
  ]);

  return (
    <AgentsClient
      agents={rows.map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        telegram: a.telegram,
        email: a.email,
        region: a.region,
        route: a.route,
        plan: a.plan,
        fact: a.fact,
        commission: a.commission,
        visits: a.visits,
        avatarColor: a.avatarColor,
      }))}
      visits={visits.map((v) => ({
        id: v.id,
        agentId: v.agentId,
        agentName: v.agentName ?? "Агент",
        storeName: v.storeName,
        storeAddress: v.storeAddress,
        gpsCoords: v.gpsCoords,
        status: v.status,
        orderTotal: String(v.orderTotal),
        notes: v.notes,
        photos: v.photos ?? [],
        visitedAt: String(v.visitedAt),
      }))}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        price: String(p.price),
        stock: p.stock,
        image: p.image,
      }))}
    />
  );
}
