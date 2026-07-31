"use client";

import { Printer, X, FileText, Receipt, ClipboardList, Scale, Languages, FileDown } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { exportPDF } from "@/shared/lib/pdfExport";

const UI = {
  ru: { invoice: "Счёт A4", waybill: "Накладная", receipt: "Чек 80 мм", reconciliation: "Акт сверки", print: "Печать / PDF", close: "Закрыть" },
  uz: { invoice: "Hisob A4", waybill: "Yuk xati", receipt: "Chek 80 mm", reconciliation: "Solishtirma dalolatnoma", print: "Chop etish / PDF", close: "Yopish" },
  en: { invoice: "Invoice A4", waybill: "Waybill", receipt: "Receipt 80 mm", reconciliation: "Reconciliation", print: "Print / PDF", close: "Close" },
} as const;

type PrintLocale = keyof typeof UI;

export function PrintToolbar({ title, orderId }: { title: string; orderId: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const lang = (params.get("lang") as PrintLocale) || "ru";
  const tr = UI[lang] ?? UI.ru;
  const langSuffix = `?lang=${lang}`;

  const docs = [
    { href: `/print/orders/${orderId}/invoice${langSuffix}`, label: tr.invoice, icon: FileText, base: `/print/orders/${orderId}/invoice` },
    { href: `/print/orders/${orderId}/waybill${langSuffix}`, label: tr.waybill, icon: ClipboardList, base: `/print/orders/${orderId}/waybill` },
    { href: `/print/orders/${orderId}/receipt${langSuffix}`, label: tr.receipt, icon: Receipt, base: `/print/orders/${orderId}/receipt` },
    { href: `/print/orders/${orderId}/reconciliation${langSuffix}`, label: tr.reconciliation, icon: Scale, base: `/print/orders/${orderId}/reconciliation` },
  ];

  return (
    <div
      className="no-print"
      style={{
        position: "sticky", top: 0, zIndex: 50, display: "flex", flexWrap: "wrap",
        alignItems: "center", gap: 8, padding: "10px 14px", background: "#0f0f14",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <span style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginRight: 4, fontFamily: "system-ui, sans-serif" }}>{title}</span>

      {docs.map((d) => {
        const Icon = d.icon;
        const active = pathname === d.base;
        return (
          <a key={d.base} href={d.href} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10,
            fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: "system-ui, sans-serif",
            color: active ? "#fff" : "#a9a9bb", background: active ? "linear-gradient(120deg,#8b5cf6,#3b82f6)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <Icon size={14} /> {d.label}
          </a>
        );
      })}

      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 9, background: "rgba(255,255,255,0.06)" }}>
        {(["ru", "uz", "en"] as PrintLocale[]).map((l) => (
          <a key={l} href={`${pathname}?lang=${l}`} style={{
            padding: "5px 8px", borderRadius: 6, textDecoration: "none", fontSize: 11, fontWeight: 700,
            background: lang === l ? "rgba(139,92,246,0.8)" : "transparent", color: "#fff",
          }}>{l.toUpperCase()}</a>
        ))}
      </div>
      <button onClick={() => window.print()} title="Нажмите Сохранить как PDF в диалоге" style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
        background: "linear-gradient(120deg,#8b5cf6,#3b82f6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
      }}><Printer size={15} /> {tr.print}</button>
      <a href={`/orders/${orderId}`} style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10,
        background: "rgba(255,255,255,0.08)", color: "#d5d5e0", textDecoration: "none", fontSize: 13, border: "1px solid rgba(255,255,255,0.1)",
      }}><X size={15} /> {tr.close}</a>
    </div>
  );
}
