import { getSessionUser } from "@/server/auth";
import { getProducts, getAgentVisits } from "@/server/queries";
import { db } from "@/db";
import { redirect } from "next/navigation";
import { AgentPortalClient } from "./AgentPortalClient";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AgentPortalPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  // Находим соответствующего агента по email или первому в базе
  let agent = (await db.select().from(s.agents).where(eq(s.agents.email, user.email)).limit(1))[0];
  if (!agent) {
    const allAgs = await db.select().from(s.agents).limit(1);
    agent = allAgs[0];
  }

  if (!agent) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold">Агент не найден</h2>
          <p className="muted text-sm mt-1">Пожалуйста, создайте запись агента в CRM.</p>
        </div>
      </div>
    );
  }

  const [products, visits] = await Promise.all([
    getProducts(),
    getAgentVisits(agent.id),
  ]);

  return (
    <AgentPortalClient
      agent={{
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        telegram: agent.telegram,
        email: agent.email,
        region: agent.region,
        route: agent.route,
        plan: agent.plan,
        fact: agent.fact,
        commission: agent.commission,
        visits: agent.visits,
        avatarColor: agent.avatarColor,
      }}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: String(p.price),
        cost: String(p.cost),
        stock: p.stock,
        image: p.image,
        images: Array.isArray(p.images) ? p.images : [],
        category: p.category ?? "Auto Care",
        volume: p.volume ?? "1 L",
        isPopular: Boolean(p.isPopular),
        isNew: Boolean(p.isNew),
        description: p.description ?? "",
      }))}
      visits={visits.map((v) => ({
        id: v.id,
        storeName: v.storeName,
        storeAddress: v.storeAddress,
        gpsCoords: v.gpsCoords,
        status: v.status,
        orderTotal: String(v.orderTotal),
        notes: v.notes,
        photos: v.photos || [],
        visitedAt: String(v.visitedAt),
      }))}
    />
  );
}
