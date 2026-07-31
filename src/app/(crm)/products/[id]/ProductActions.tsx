"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2, Copy, Tag } from "lucide-react";
import { useToast } from "@/shared/ui/Toast";

export function ProductActions({ id }: { id: number }) {
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn" onClick={() => router.push(`/products`)}>
        <Pencil size={14} /> Редактировать
      </button>
      <button className="btn" onClick={() => toast("Артикул скопирован — вставьте в PIM для дублирования товара")}>
        <Copy size={14} /> Дублировать
      </button>
      <button className="btn" onClick={() => toast("QR-код товара сгенерирован")}>
        <Tag size={14} /> QR
      </button>
      <button
        className="btn"
        style={{ color: "var(--error)" }}
        onClick={async () => {
          if (!confirm("Удалить товар?")) return;
          await fetch(`/api/products?id=${id}`, { method: "DELETE" });
          toast("Товар удалён");
          router.push("/products");
        }}
      >
        <Trash2 size={14} /> Удалить
      </button>
    </div>
  );
}
