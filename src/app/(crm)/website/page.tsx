import { getContent } from "@/server/queries";
import { Card, PageHeader } from "@/shared/ui/kit";
import { dt } from "@/shared/lib/format";
import { ContentCard } from "@/widgets/ContentCard";
import { WebsiteHeaderActions, SeoForm } from "./WebsiteActions";

export const dynamic = "force-dynamic";

const SEO_DEFAULTS: Record<string, string> = {
  title: "DELIS — профессиональная химия для дома и авто",
  description: "Каталог DELIS: автошампуни, воски, гели для посуды и стирки. Доставка по Узбекистану.",
  ogImage: "og-delis-2026.jpg",
  robots: "User-agent: * / Allow: /",
  sitemap: "https://delis.uz/sitemap.xml",
  canonical: "https://delis.uz",
};

export default async function WebsitePage() {
  const blocks = await getContent("site");

  return (
    <>
      <PageHeader
        title="Управление сайтом"
        subtitle="Редактор страниц, SEO, метаданные и публикация — всё из CRM"
        actions={<WebsiteHeaderActions />}
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-4">Страницы сайта</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {blocks.map((b) => (
              <ContentCard key={b.id} id={b.id} title={b.title} body={b.body} enabled={b.enabled} statusLabel={b.enabled ? "Опубликовано" : "Черновик"} updatedAt={dt(b.updatedAt)} />
            ))}
            <ContentCard title="Контакты" body="Адрес, карта, форма обратной связи" enabled statusLabel="Опубликовано" />
            <ContentCard title="Отзывы" body="46 отзывов · рейтинг 4.9" enabled statusLabel="Опубликовано" />
            <ContentCard title="Новости" body="12 публикаций" enabled statusLabel="Опубликовано" />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">SEO и метаданные</h3>
          <SeoForm initial={SEO_DEFAULTS} />
        </Card>
      </div>
    </>
  );
}
