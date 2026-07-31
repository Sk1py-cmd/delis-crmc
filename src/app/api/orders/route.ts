import { NextRequest, NextResponse } from "next/server";
import { createOrderQuick, createMultiOrder } from "@/server/queries";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/server/auth";

export async function POST(req: NextRequest) {
  const auth = await getSessionUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { customerId: number; productId?: number; qty?: number; payment?: string; items?: { productId: number; qty: number }[] };
  if (!body.customerId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (Array.isArray(body.items) && body.items.length > 0) {
    const order = await createMultiOrder(body.customerId, body.items);
    revalidatePath("/orders");
    return NextResponse.json({ order });
  }

  if (!body.productId) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const order = await createOrderQuick(body.customerId, body.productId, Math.max(1, body.qty || 1), body.payment || "click");
  revalidatePath("/orders");
  return NextResponse.json({ order });
}
