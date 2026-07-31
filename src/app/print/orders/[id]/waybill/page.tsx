import { getOrder } from "@/server/queries";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/app/print/PrintToolbar";

export const dynamic = "force-dynamic";

type L = "ru" | "uz" | "en";
const T: Record<L, Record<string, string>> = {
  ru: { title:"ТОВАРНАЯ НАКЛАДНАЯ", form:"Форма ТОРГ-12", supplier:"Поставщик", buyer:"Грузополучатель", basis:"Основание", name:"Наименование товара", unit:"Ед. изм.", qty:"Кол-во", price:"Цена", net:"Без НДС", vat:"НДС 12%", total:"Всего с НДС", grand:"ИТОГО", shipped:"Отпустил", received:"Получил", dateReceived:"Дата получения", stamp:"М.П.", print:"Печать / PDF" },
  uz: { title:"TOVAR NAKLADNOYI", form:"TORG-12 shakli", supplier:"Yetkazib beruvchi", buyer:"Yuk oluvchi", basis:"Asos", name:"Mahsulot nomi", unit:"O'lchov", qty:"Miqdor", price:"Narx", net:"QQSsiz", vat:"QQS 12%", total:"QQS bilan jami", grand:"JAMI", shipped:"Jo'natdi", received:"Qabul qildi", dateReceived:"Qabul sanasi", stamp:"M.P.", print:"Chop etish / PDF" },
  en: { title:"DELIVERY NOTE", form:"Form TORG-12", supplier:"Supplier", buyer:"Consignee", basis:"Basis", name:"Description", unit:"Unit", qty:"Qty", price:"Price", net:"Excl. VAT", vat:"VAT 12%", total:"Total incl. VAT", grand:"TOTAL", shipped:"Shipped by", received:"Received by", dateReceived:"Date received", stamp:"Stamp", print:"Print / PDF" },
};
const num=(n:number)=>Math.round(n).toLocaleString("ru-RU");

export default async function WaybillPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{lang?:string}> }) {
  const {id}=await params; const sp=await searchParams; const lang:L=sp.lang==="uz"||sp.lang==="en"?sp.lang:"ru"; const t=T[lang];
  const data=await getOrder(Number(id)); if(!data) notFound();
  const {order,items,customer}=data;
  const rows=items.map(i=>{const sum=Number(i.price)*i.qty;const vat=Math.round(sum*.12/1.12);return {...i,sum,vat,net:sum-vat};});
  const total=rows.reduce((a,r)=>a+r.sum,0), totalVat=rows.reduce((a,r)=>a+r.vat,0), totalQty=rows.reduce((a,r)=>a+r.qty,0);
  const date=new Date(order.createdAt).toLocaleDateString(lang==="uz"?"uz-UZ":lang==="en"?"en-GB":"ru-RU",{day:"2-digit",month:"long",year:"numeric"});
  return <>
    <style>{`
      .waybill-page{max-width:1100px;margin:24px auto;background:#fff;color:#1a1a2e;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      .wb-head{background:linear-gradient(135deg,#1e1b4b,#4c1d95 65%,#7c3aed);color:#fff;padding:28px 36px;display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center}.wb-brand{font-size:26px;font-weight:900}.wb-sub{font-size:9px;letter-spacing:3px;opacity:.65;margin-top:4px}.wb-center{text-align:center}.wb-center h2{font-size:20px;font-weight:800}.wb-center p{font-size:11px;opacity:.75;margin-top:4px}.wb-right{text-align:right}.wb-right strong{font-size:20px}.wb-right p{font-size:11px;opacity:.75;margin-top:4px}
      .wb-body{padding:28px 36px}.wb-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px}.wb-card{padding:14px;border-radius:12px;background:#f8f7ff;border:1px solid #e5e3ff}.wb-card h4{font-size:9px;color:#7c3aed;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}.wb-card p{font-size:12px;line-height:1.65;color:#444}.wb-card b{color:#1e1b4b}.wb-basis{font-size:11px;color:#666;margin-bottom:14px}
      .wb-table{width:100%;border-collapse:collapse}.wb-table th{padding:9px 8px;text-align:left;font-size:8px;letter-spacing:.7px;color:#7c3aed;text-transform:uppercase;background:#f8f7ff;border-bottom:2px solid #e5e3ff}.wb-table td{padding:9px 8px;font-size:11px;border-bottom:1px solid #eee}.wb-table .r{text-align:right}.wb-table .c{text-align:center}.wb-table tfoot td{font-weight:700;background:#f8f7ff;border-top:2px solid #e5e3ff}
      .wb-signs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px}.wb-sign{text-align:center}.wb-line{height:24px;border-bottom:1.5px solid #1e1b4b;margin-bottom:5px}.wb-cap{font-size:9px;color:#999}.wb-foot{margin-top:22px;padding-top:14px;border-top:1px solid #eee;font-size:10px;color:#999;display:flex;justify-content:space-between}
      @media print{.no-print{display:none!important}.waybill-page{box-shadow:none;border-radius:0;margin:0;max-width:none}.wb-body{padding:20px 30px}}
    `}</style>
    <PrintToolbar title={`${t.title} ${order.number}`} orderId={order.id}/>
    <main className="waybill-page">
      <header className="wb-head"><div><div className="wb-brand">DELIS</div><div className="wb-sub">Professional Chemicals</div></div><div className="wb-center"><h2>{t.title}</h2><p>{t.form}</p></div><div className="wb-right"><strong>№ {order.number}</strong><p>{date}</p></div></header>
      <section className="wb-body">
        <div className="wb-grid"><div className="wb-card"><h4>{t.supplier}</h4><p><b>ООО «DELIS CHEMICALS»</b><br />{lang==="en"?"Tashkent, Amir Temur str. 108":lang==="uz"?"Toshkent, Amir Temur ko'chasi, 108":"г. Ташкент, ул. Амира Темура, 108"}<br />{lang==="uz"?"STIR":"TIN"} 302 456 789<br />+998 71 200-70-70</p></div><div className="wb-card"><h4>{t.buyer}</h4><p><b>{customer?`${customer.firstName} ${customer.lastName}`:lang==="en"?"Retail buyer":lang==="uz"?"Chakana xaridor":"Розничный покупатель"}</b><br />{customer?`${customer.city}${customer.address?", "+customer.address:""}`:""}<br />{customer?.phone??""}</p></div></div>
        <div className="wb-basis">{t.basis}: {lang==="en"?"Order":lang==="uz"?"Buyurtma":"Заказ"} {order.number}</div>
        <table className="wb-table"><thead><tr><th>#</th><th>{t.name}</th><th className="c">{t.unit}</th><th className="c">{t.qty}</th><th className="r">{t.price}</th><th className="r">{t.net}</th><th className="r">{t.vat}</th><th className="r">{t.total}</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><td className="c">{i+1}</td><td>{r.name}</td><td className="c">{lang==="en"?"pcs":lang==="uz"?"dona":"шт"}</td><td className="c">{r.qty}</td><td className="r">{num(Number(r.price))}</td><td className="r">{num(r.net)}</td><td className="r">{num(r.vat)}</td><td className="r"><b>{num(r.sum)}</b></td></tr>)}</tbody><tfoot><tr><td colSpan={3} className="c">{t.grand}</td><td className="c">{totalQty}</td><td className="r">—</td><td className="r">{num(total-totalVat)}</td><td className="r">{num(totalVat)}</td><td className="r">{num(total)}</td></tr></tfoot></table>
        <div className="wb-signs"><div className="wb-sign"><div className="wb-line"/><div className="wb-cap">{t.shipped}</div></div><div className="wb-sign"><div className="wb-line"/><div className="wb-cap">{t.received}</div></div><div className="wb-sign"><div className="wb-line"/><div className="wb-cap">{t.dateReceived}</div></div></div>
        <footer className="wb-foot"><span>{t.stamp} DELIS</span><span>DELIS · {date}</span><span>{t.stamp} {t.buyer}</span></footer>
      </section>
    </main>
  </>;
}
