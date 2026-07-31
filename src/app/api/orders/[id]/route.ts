import { NextRequest, NextResponse } from "next/server";
import { setOrderStatus } from "@/server/queries";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/server/auth";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getSessionUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: string };
  if (!body.status) return NextResponse.json({ error: "status required" }, { status: 400 });
  const order = await setOrderStatus(Number(id), body.status);
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  return NextResponse.json({ order });
}
