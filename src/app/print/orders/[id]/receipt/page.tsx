import { getOrder } from "@/server/queries";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/app/print/PrintToolbar";

export const dynamic = "force-dynamic";

type L = "ru" | "uz" | "en";
const T: Record<L, Record<string, string>> = {
  ru: { receipt: "КАССОВЫЙ ЧЕК", number: "Чек №", date: "Дата", cashier: "Кассир", customer: "Клиент", qty: "Кол-во", subtotal: "Подытог", vat: "НДС 12%", total: "ИТОГО", payment: "Оплата", thanks: "Спасибо за покупку!", qr: "QR для оплаты", print: "Печать / PDF" },
  uz: { receipt: "KASSA CHEKI", number: "Chek №", date: "Sana", cashier: "Kassir", customer: "Xaridor", qty: "Miqdor", subtotal: "Oraliq jami", vat: "QQS 12%", total: "JAMI", payment: "To'lov", thanks: "Xaridingiz uchun rahmat!", qr: "To'lov uchun QR", print: "Chop etish / PDF" },
  en: { receipt: "RECEIPT", number: "Receipt №", date: "Date", cashier: "Cashier", customer: "Customer", qty: "Qty", subtotal: "Subtotal", vat: "VAT 12%", total: "TOTAL", payment: "Payment", thanks: "Thank you for your purchase!", qr: "Payment QR", print: "Print / PDF" },
};
const PAY: Record<string, Record<L, string>> = { click:{ru:"Click",uz:"Click",en:"Click"}, payme:{ru:"Payme",uz:"Payme",en:"Payme"}, uzum:{ru:"Uzum",uz:"Uzum",en:"Uzum"}, cash:{ru:"Наличные",uz:"Naqd",en:"Cash"}, bank:{ru:"Банк",uz:"Bank",en:"Bank"}, crm:{ru:"CRM",uz:"CRM",en:"CRM"} };
const num = (n: number) => Math.round(n).toLocaleString("ru-RU");

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const lang: L = sp.lang === "uz" || sp.lang === "en" ? sp.lang : "ru";
  const t = T[lang];
  const data = await getOrder(Number(id));
  if (!data) notFound();
  const { order, items, customer } = data;
  const total = Number(order.total);
  const vat = Math.round((total * 0.12) / 1.12);
  const net = total - vat;
  const qty = items.reduce((a, i) => a + i.qty, 0);
  const payment = PAY[order.payment]?.[lang] ?? order.payment;

  return (
    <>
      <style>{`
        .receipt-page{width:302px;margin:24px auto;background:#fff;color:#151525;border-radius:12px;padding:16px 14px 20px;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:'Courier New',Courier,monospace}
        .c{text-align:center}.b{font-weight:700}.line{border-top:1px dashed #333;margin:8px 0}.row{display:flex;justify-content:space-between;font-size:11px;gap:8px}.sm{font-size:9.5px;color:#555}.it{margin-bottom:7px}.itn{font-size:11px;font-weight:700;line-height:1.35}.itr{display:flex;justify-content:space-between;font-size:9.5px;color:#555}.big{font-size:15px;font-weight:900}.qr{width:60px;height:60px;display:grid;grid-template-columns:repeat(6,1fr);gap:1px;padding:3px;border:1px solid #aaa;border-radius:4px;margin:6px auto}.qr i{aspect-ratio:1}.receipt-foot{margin-top:10px;padding-top:10px;border-top:1px dashed #333}
        @media print{.no-print{display:none!important}.receipt-page{box-shadow:none;border-radius:0;width:80mm;margin:0;padding:5mm}}
      `}</style>
      <PrintToolbar title={`${t.receipt} ${order.number}`} orderId={order.id} />
      <main className="receipt-page">
        <div className="c b" style={{ fontSize: 20, letterSpacing: -0.5 }}>DELIS</div>
        <div className="c sm" style={{ letterSpacing: 2, textTransform: "uppercase" }}>Professional Chemicals</div>
        <div className="line" />
        <div className="c b" style={{ fontSize: 14, marginBottom: 8 }}>{t.receipt}</div>
        <div className="row"><span>{t.number}</span><span className="b">{order.number}</span></div>
        <div className="row"><span>{t.date}</span><span>{new Date(order.createdAt).toLocaleDateString(lang === "uz" ? "uz-UZ" : lang === "en" ? "en-GB" : "ru-RU")}</span></div>
        <div className="row"><span>{t.cashier}</span><span>DELIS CRM</span></div>
        {customer && <div className="row"><span>{t.customer}</span><span>{customer.firstName} {customer.lastName}</span></div>}
        <div className="line" />
        {items.map((it, i) => <div key={it.id} className="it"><div className="itn">{i + 1}. {it.name}</div><div className="itr"><span>{it.qty} {lang === "en" ? "pcs" : lang === "uz" ? "dona" : "шт"} × {num(Number(it.price))}</span><span className="b" style={{ color: "#000" }}>{num(Number(it.price) * it.qty)}</span></div></div>)}
        <div className="line" />
        <div className="row sm"><span>{lang === "en" ? "Positions / units" : lang === "uz" ? "Pozitsiyalar / dona" : "Позиций / единиц"}</span><span>{items.length} / {qty}</span></div>
        <div className="row"><span>{t.subtotal}</span><span>{num(net)}</span></div>
        <div className="row"><span>{t.vat}</span><span>{num(vat)}</span></div>
        <div className="line" />
        <div className="row big"><span>{t.total}</span><span>{num(total)}</span></div>
        <div className="line" />
        <div className="c" style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 2 }}>*{order.number}*</div>
        <div className="c"><div className="qr">{Array.from({length:36},(_,i)=><i key={i} style={{background:(i*7+order.id*3)%3===0?"#000":"transparent"}}/>)}</div><div className="sm">{t.qr}</div></div>
        <div className="receipt-foot c sm">{t.payment}: {payment}<br />{t.thanks}<br />delis.uz · +998 71 200-70-70</div>
      </main>
    </>
  );
}
