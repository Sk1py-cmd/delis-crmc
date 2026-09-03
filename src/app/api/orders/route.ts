import { NextRequest, NextResponse } from "next/server";
import { createOrderQuick, createMultiOrder, recentOrdersList, BusinessError } from "@/server/queries";
import { revalidatePath } from "next/cache";
import { requireApiAccess } from "@/server/apiGuard";

/** Список последних заказов. Параметр `limit` — от 1 до 200. */
export async function GET(req: NextRequest) {
  const guard = await requireApiAccess("/orders");
  if (!guard.ok) return guard.response;

  const raw = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 200) : 100;

  return NextResponse.json({ orders: await recentOrdersList(limit) });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiAccess("/orders");
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as { customerId: number; productId?: number; qty?: number; payment?: string; items?: { productId: number; qty: number }[] };
  if (!body.customerId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (!Array.isArray(body.items) && !body.productId) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const order =
      Array.isArray(body.items) && body.items.length > 0
        ? await createMultiOrder(body.customerId, body.items)
        : await createOrderQuick(body.customerId, body.productId!, Math.max(1, body.qty || 1), body.payment || "click");

    revalidatePath("/orders");
    return NextResponse.json({ order });
  } catch (e) {
    // Нехватка товара — ошибка пользователя, а не сбой сервера.
    if (e instanceof BusinessError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
