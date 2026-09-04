import { getContent, getProducts } from "@/server/queries";
import { Card, PageHeader } from "@/shared/ui/kit";
import { ContentCard } from "@/widgets/ContentCard";
import { InstagramActions } from "./InstagramActions";

export const dynamic = "force-dynamic";

export default async function InstagramPage() {
  const [blocks, products] = await Promise.all([getContent("instagram"), getProducts()]);

  return (
    <>
      <PageHeader
        title="Instagram"
        subtitle="Контент-план, баннеры, публикации и шаблоны сторис"
        actions={<InstagramActions />}
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-4">Контент-план недели</h3>
          <p className="text-sm muted py-8 text-center">
            Публикаций пока нет — создайте первую через кнопку «Создать публикацию»
          </p>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Шаблоны и баннеры</h3>
          <div className="grid grid-cols-3 gap-2">
            {products.slice(0, 9).map((p, i) => (
              <div
                key={p.id}
                className="aspect-square rounded-2xl grid place-items-center text-2xl"
                style={{
                  background: `linear-gradient(${140 + i * 20}deg, color-mix(in srgb, var(--primary) ${20 + i * 4}%, transparent), color-mix(in srgb, var(--accent) 18%, transparent))`,
                  border: "1px solid rgba(var(--border))",
                }}
              >
                {p.image}
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-sm muted py-6 text-center">
              Товаров пока нет — изображения появятся после добавления каталога
            </p>
          )}
          <div className="mt-4 grid gap-2">
            {blocks.map((b) => (
              <ContentCard key={b.id} id={b.id} title={b.title} body={b.body} enabled={b.enabled} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
