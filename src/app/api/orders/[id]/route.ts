import { NextRequest, NextResponse } from "next/server";
import { setOrderStatus } from "@/server/queries";
import { revalidatePath } from "next/cache";
import { requireApiAccess } from "@/server/apiGuard";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiAccess("/orders");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: string };
  if (!body.status) return NextResponse.json({ error: "status required" }, { status: 400 });
  const order = await setOrderStatus(Number(id), body.status);
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  return NextResponse.json({ order });
}
