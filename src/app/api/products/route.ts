import { NextRequest, NextResponse } from "next/server";
import { upsertProduct, deleteProduct, adjustStock, getProducts } from "@/server/queries";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/server/auth";

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
  // Каталог содержит себестоимость и остатки — только для авторизованных.
  const auth = await getSessionUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ products: await getProducts() });
}

export async function POST(req: NextRequest) {
  const auth = await getSessionUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as ProductPayload;
  const product = await upsertProduct(body);
  revalidatePath("/products");
  revalidatePath("/warehouse");
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest) {
  const auth = await getSessionUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id") ?? 0);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteProduct(id);
  revalidatePath("/products");
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const auth = await getSessionUser();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { productId: number; kind: string; qty: number; note?: string };
  await adjustStock(body.productId, body.kind, body.qty, body.note ?? "Корректировка склада");
  revalidatePath("/warehouse");
  revalidatePath("/products");
  return NextResponse.json({ ok: true });
}
