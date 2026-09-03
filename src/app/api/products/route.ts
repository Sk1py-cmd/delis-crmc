import { NextRequest, NextResponse } from "next/server";
import { upsertProduct, deleteProduct, adjustStock, getProducts } from "@/server/queries";
import { revalidatePath } from "next/cache";
import { requireApiAccess } from "@/server/apiGuard";
import { BusinessError } from "@/server/queries";

export const dynamic = "force-dynamic";

interface ProductPayload {
  id?: number;
  name?: string;
  sku?: string;
  price?: string;
  cost?: string;
  stock?: number;
  volume?: string;
  image?: string;
  description?: string;
  categoryId?: number;
  status?: string;
}

export async function GET() {
  // Каталог содержит себестоимость и остатки — только для тех, кому
  // раздел товаров доступен по роли.
  const guard = await requireApiAccess("/products");
  if (!guard.ok) return guard.response;

  return NextResponse.json({ products: await getProducts() });
}

export async function POST(req: NextRequest) {
  const guard = await requireApiAccess("/products");
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as ProductPayload;
  const product = await upsertProduct(body);
  revalidatePath("/products");
  revalidatePath("/warehouse");
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireApiAccess("/products");
  if (!guard.ok) return guard.response;
  const id = Number(req.nextUrl.searchParams.get("id") ?? 0);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteProduct(id);
  revalidatePath("/products");
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  // Это корректировка остатков, а не правка карточки товара, поэтому
  // и раздел проверяем складской.
  const guard = await requireApiAccess("/warehouse");
  if (!guard.ok) return guard.response;

  const body = (await req.json()) as { productId?: number; kind?: string; qty?: number; note?: string };
  const productId = Number(body.productId ?? 0);
  const qty = Number(body.qty ?? 0);

  // Без валидации любой мусор в теле уходил в SQL и возвращался как 500.
  if (!productId || !body.kind || !Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json(
      { error: "Укажите товар, тип операции и количество больше нуля" },
      { status: 400 },
    );
  }

  try {
    await adjustStock(productId, body.kind, qty, body.note ?? "Корректировка склада");
  } catch (e) {
    // Нехватка остатка — ошибка пользователя, а не сбой сервера.
    if (e instanceof BusinessError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  revalidatePath("/warehouse");
  revalidatePath("/products");
  return NextResponse.json({ ok: true });
}
