"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer, Send, RefreshCw, FileText, ClipboardList, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { postManage } from "@/shared/lib/manage";
import { useLocale } from "@/shared/store/locale";

export function OrderActions({
  id,
  status,
  statuses,
}: {
  id: number;
  status: string;
  statuses: { key: string; label: string; color: string }[];
}) {
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const { locale } = useLocale();

  const change = (next: string) =>
    start(async () => {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
      setToast(`Статус обновлён: ${statuses.find((s) => s.key === next)?.label}`);
      setTimeout(() => setToast(null), 2500);
    });

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <select className="input !w-auto" value={status} onChange={(e) => change(e.target.value)} disabled={pending}>
        {statuses.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <button className="btn" onClick={() => window.open(`/print/orders/${id}/invoice?lang=${locale}`, "_blank")}>
        <Printer size={15} /> Счёт A4
      </button>
      <button className="btn" onClick={() => window.open(`/print/orders/${id}/waybill?lang=${locale}`, "_blank")}>
        <ClipboardList size={15} /> Накладная
      </button>
      <button className="btn" onClick={() => window.open(`/print/orders/${id}/receipt?lang=${locale}`, "_blank")}>
        <FileText size={15} /> Чек 80мм
      </button>
      <button className="btn" onClick={() => window.open(`/print/orders/${id}/reconciliation?lang=${locale}`, "_blank")}>
        <Scale size={15} /> Акт сверки
      </button>
      <button
        className="btn btn-primary"
        onClick={async () => {
          try {
            await postManage("sendOrderToClient", { orderId: id });
            notify("Счёт отправлен клиенту в Telegram и продублирован в чат CRM");
          } catch {
            notify("Не удалось отправить — попробуйте ещё раз");
          }
        }}
      >
        <Send size={15} /> Отправить клиенту
      </button>
      <button className="btn" onClick={() => router.refresh()}>
        <RefreshCw size={15} />
      </button>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            className="glass card-pad fixed bottom-6 right-6 z-[120] text-sm"
            style={{ borderColor: "color-mix(in srgb, var(--success) 40%, transparent)" }}
          >
            ✅ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
