import { getOrder } from "@/server/queries";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/app/print/PrintToolbar";

export const dynamic = "force-dynamic";

type L = "ru" | "uz" | "en";
const T: Record<L, Record<string, string>> = {
  ru: { title: "СЧЁТ НА ОПЛАТУ", supplier: "Поставщик", buyer: "Покупатель", number: "№", date: "от", qty: "Кол-во", price: "Цена", amount: "Сумма", subtotal: "Подытог", vat: "НДС 12%", total: "ИТОГО", payment: "Способы оплаты", paymentNote: "Укажите номер счёта при оплате", manager: "Руководитель", accountant: "Главный бухгалтер", stamp: "Дата и М.П.", thanks: "Спасибо за сотрудничество! DELIS — профессиональная химия для дома и авто", cash: "Наличные", bank: "Банковский перевод", retail: "Розничный покупатель", name: "Наименование" },
  uz: { title: "TO'LOV HISOBVARAQ", supplier: "Yetkazib beruvchi", buyer: "Xaridor", number: "№", date: "dan", qty: "Miqdor", price: "Narx", amount: "Summa", subtotal: "Oraliq jami", vat: "QQS 12%", total: "JAMI", payment: "To'lov usullari", paymentNote: "To'lovda hisob raqamini ko'rsating", manager: "Rahbar", accountant: "Bosh hisobchi", stamp: "Sana va M.P.", thanks: "Hamkorlik uchun rahmat! DELIS — uy va avto uchun professional kimyo", cash: "Naqd", bank: "Bank o'tkazmasi", retail: "Chakana xaridor", name: "Mahsulot nomi" },
  en: { title: "INVOICE", supplier: "Supplier", buyer: "Buyer", number: "№", date: "from", qty: "Qty", price: "Price", amount: "Amount", subtotal: "Subtotal", vat: "VAT 12%", total: "TOTAL", payment: "Payment methods", paymentNote: "Please reference invoice number when paying", manager: "Manager", accountant: "Chief Accountant", stamp: "Date & stamp", thanks: "Thank you for your business! DELIS — professional chemicals for home and auto", cash: "Cash", bank: "Bank transfer", retail: "Retail buyer", name: "Item name" },
};

const payKey: Record<string, string> = { click: "Click", payme: "Payme", uzum: "Uzum", cash: "cash", bank: "bank", crm: "CRM" };
const num = (n: number) => Math.round(n).toLocaleString("ru-RU");

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang: paramLang } = await searchParams;
  const lang: L = paramLang === "uz" || paramLang === "en" ? paramLang : "ru";
  const t = T[lang];
  const data = await getOrder(Number(id));
  if (!data) notFound();
  const { order, items, customer } = data;
  const total = Number(order.total);
  const vat = Math.round((total * 0.12) / 1.12);
  const net = total - vat;
  const payment = payKey[order.payment] === "cash" ? t.cash : payKey[order.payment] === "bank" ? t.bank : payKey[order.payment] ?? order.payment;
  const date = new Date(order.createdAt).toLocaleDateString(lang === "uz" ? "uz-UZ" : lang === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{`
        .print-page{max-width:800px;margin:24px auto;background:#fff;color:#1a1a2e;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
        .invoice-head{padding:32px 40px;color:#fff;background:linear-gradient(135deg,#1e1b4b,#4c1d95 65%,#7c3aed);display:flex;justify-content:space-between;gap:24px}
        .invoice-brand{font-size:30px;font-weight:900;letter-spacing:-1px}.invoice-sub{font-size:9px;letter-spacing:3px;text-transform:uppercase;opacity:.7;margin-top:4px}.invoice-meta{text-align:right}.invoice-title{font-size:22px;font-weight:800}.invoice-date{font-size:11px;opacity:.75;margin-top:5px}
        .invoice-body{padding:32px 40px}.invoice-parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}.invoice-card{padding:16px;border-radius:12px;background:#f8f7ff;border:1px solid #e5e3ff}.invoice-card h4{font-size:9px;color:#7c3aed;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:7px}.invoice-card p{font-size:12px;line-height:1.65;color:#444}.invoice-card b{color:#1e1b4b}
        .invoice-table{width:100%;border-collapse:collapse}.invoice-table th{padding:10px;text-align:left;font-size:9px;letter-spacing:1px;color:#7c3aed;text-transform:uppercase;background:#f8f7ff;border-bottom:2px solid #e5e3ff}.invoice-table td{padding:11px 10px;font-size:12px;border-bottom:1px solid #eee}.invoice-table .r{text-align:right}.invoice-table .c{text-align:center}
        .invoice-totals{display:flex;justify-content:flex-end;margin-top:20px}.invoice-totals-box{width:260px}.invoice-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:#666}.invoice-total{display:flex;justify-content:space-between;padding:14px 0;border-top:3px solid #7c3aed;font-size:18px;font-weight:900;color:#1e1b4b;margin-top:7px}
        .invoice-payment{text-align:center;margin-top:25px;padding-top:20px;border-top:1px solid #eee}.invoice-payment h4{font-size:10px;letter-spacing:1.5px;color:#7c3aed;text-transform:uppercase;margin-bottom:8px}.qr{width:78px;height:78px;display:grid;grid-template-columns:repeat(6,1fr);gap:2px;padding:4px;border:2px solid #e5e3ff;border-radius:8px;margin:0 auto 8px}.qr i{aspect-ratio:1}.invoice-payment p{font-size:10px;color:#999;margin:4px}
        .invoice-signs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:28px}.sign{text-align:center}.sign-line{height:26px;border-bottom:1px solid #1e1b4b;margin-bottom:6px}.sign-caption{font-size:9px;color:#999}.invoice-footer{text-align:center;border-top:1px solid #eee;margin-top:24px;padding-top:14px;font-size:10px;color:#aaa}
        @media print{.no-print{display:none!important}.print-page{box-shadow:none;border-radius:0;margin:0;max-width:none}.invoice-body{padding:20px 30px}}
      `}</style>
      <PrintToolbar title={`${t.title} ${order.number}`} orderId={order.id} />
      <main className="print-page">
        <header className="invoice-head">
          <div><div className="invoice-brand">DELIS</div><div className="invoice-sub">Professional Chemicals</div></div>
          <div className="invoice-meta"><div className="invoice-title">{t.title}</div><div className="invoice-date">{t.number} {order.number} · {t.date} {date}</div><div className="invoice-date">{t.payment}: {payment}</div></div>
        </header>
        <section className="invoice-body">
          <div className="invoice-parties">
            <div className="invoice-card"><h4>{t.supplier}</h4><p><b>ООО «DELIS CHEMICALS»</b><br />{lang === "en" ? "Tashkent, Amir Temur str. 108" : lang === "uz" ? "Toshkent, Amir Temur ko'chasi, 108" : "г. Ташкент, ул. Амира Темура, 108"}<br />{lang === "uz" ? "STIR" : "TIN"} 302 456 789<br />+998 71 200-70-70</p></div>
            <div className="invoice-card"><h4>{t.buyer}</h4><p><b>{customer ? `${customer.firstName} ${customer.lastName}` : t.retail}</b><br />{customer ? `${customer.city}${customer.address ? ", " + customer.address : ""}` : ""}<br />{customer?.phone ?? ""}</p></div>
          </div>
          <table className="invoice-table"><thead><tr><th>#</th><th>{t.name}</th><th className="c">{t.qty}</th><th className="r">{t.price}</th><th className="r">{t.amount}</th></tr></thead><tbody>{items.map((it, i) => <tr key={it.id}><td>{i + 1}</td><td>{it.name}</td><td className="c">{it.qty}</td><td className="r">{num(Number(it.price))}</td><td className="r"><b>{num(Number(it.price) * it.qty)}</b></td></tr>)}</tbody></table>
          <div className="invoice-totals"><div className="invoice-totals-box"><div className="invoice-row"><span>{t.subtotal}</span><span>{num(net)}</span></div><div className="invoice-row"><span>{t.vat}</span><span>{num(vat)}</span></div><div className="invoice-total"><span>{t.total}</span><span>{num(total)}</span></div></div></div>
          <div className="invoice-payment"><h4>{t.payment}</h4><div className="qr">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ background: (i * 7 + order.id * 5) % 3 === 0 ? "#1e1b4b" : "transparent" }} />)}</div><p>Click · Payme · Uzum</p><p>{t.paymentNote}: {order.number}</p></div>
          <div className="invoice-signs"><div className="sign"><div className="sign-line"/><div className="sign-caption">{t.manager}</div></div><div className="sign"><div className="sign-line"/><div className="sign-caption">{t.accountant}</div></div><div className="sign"><div className="sign-line"/><div className="sign-caption">{t.stamp}</div></div></div>
          <footer className="invoice-footer">DELIS · {t.thanks}</footer>
        </section>
      </main>
    </>
  );
}
