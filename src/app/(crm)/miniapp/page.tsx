import { getContent, getProducts } from "@/server/queries";
import { Card, PageHeader, Badge } from "@/shared/ui/kit";
import { money } from "@/shared/lib/format";
import { ContentCard } from "@/widgets/ContentCard";
import { MiniAppActions } from "./MiniAppActions";

export const dynamic = "force-dynamic";

export default async function MiniAppPage() {
  const [blocks, products] = await Promise.all([getContent("miniapp"), getProducts()]);
  const featured = products.slice(0, 4);

  return (
    <>
      <PageHeader
        title="Telegram Mini App"
        subtitle="Полное управление витриной Mini App: баннеры, каталог, темы, навигация и push"
        actions={
          <>
            <MiniAppActions />
          </>
        }
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-4">Конфигурация витрины</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {blocks.map((b) => (
              <ContentCard key={b.id} id={b.id} title={b.title} body={b.body} enabled={b.enabled} />
            ))}
            <ContentCard title="Цветовая тема" body="Space Gray + Purple Primary" enabled statusLabel="Синхр." />
            <ContentCard title="Локализация" body="RU · UZ · EN" enabled statusLabel="Синхр." />
            <ContentCard title="Push-уведомления" body="Включены для 1 248 подписчиков" enabled statusLabel="Синхр." />
            <ContentCard title="Акции" body="2 активные кампании" enabled statusLabel="Синхр." />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Живой предпросмотр</h3>
          <div
            className="mx-auto rounded-[36px] p-3 w-[260px]"
            style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(0,0,0,0.4))", border: "1px solid rgba(var(--border))" }}
          >
            <div className="rounded-[28px] overflow-hidden" style={{ background: "var(--bg-2)" }}>
              <div className="p-4" style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
                <div className="text-white font-semibold">DELIS</div>
                <div className="text-white/80 text-[0.68rem]">Химия для дома и авто</div>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {featured.map((p) => (
                  <div key={p.id} className="rounded-2xl p-2" style={{ background: "rgba(var(--surface),0.9)", border: "1px solid rgba(var(--border))" }}>
                    <div className="text-2xl text-center">{p.image}</div>
                    <div className="text-[0.62rem] mt-1 line-clamp-2">{p.name}</div>
                    <div className="text-[0.65rem] font-semibold mt-1">{money(p.price)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-around py-2.5 text-[0.6rem] muted" style={{ borderTop: "1px solid rgba(var(--border))" }}>
                <span>Каталог</span>
                <span>Корзина</span>
                <span>Заказы</span>
                <span>Профиль</span>
              </div>
            </div>
          </div>
          <p className="muted text-xs text-center mt-3">Данные берутся из той же базы, что и CRM — изменения видны мгновенно.</p>
        </Card>
      </div>
    </>
  );
}
