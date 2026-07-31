import { getContent, getProducts } from "@/server/queries";
import { Card, PageHeader, Badge, Progress } from "@/shared/ui/kit";
import { StatGrid } from "@/widgets/StatCard";
import { ContentCard } from "@/widgets/ContentCard";
import { ActionButton } from "@/shared/ui/ActionButton";
import { InstagramActions } from "./InstagramActions";

export const dynamic = "force-dynamic";

const PLAN = [
  ["Пн", "Reels: тест автошампуня", "#8b5cf6", "Готово"],
  ["Вт", "Карусель: гели для посуды", "#3b82f6", "На модерации"],
  ["Ср", "Сторис: акция −20%", "#22c55e", "Запланировано"],
  ["Чт", "Пост: отзывы клиентов", "#f97316", "Черновик"],
  ["Пт", "Reels: детейлинг салона", "#ec4899", "Запланировано"],
  ["Сб", "Розыгрыш набора DELIS", "#14b8a6", "Идея"],
];

export default async function InstagramPage() {
  const [blocks, products] = await Promise.all([getContent("instagram"), getProducts()]);

  return (
    <>
      <PageHeader
        title="Instagram"
        subtitle="Контент-план, баннеры, публикации и шаблоны сторис"
        actions={<InstagramActions />}
      />

      <StatGrid
        stats={[
          { label: "Подписчики", value: 48250, color: "#ec4899", icon: "📸", mode: "num", delta: 6.8 },
          { label: "Охват за месяц", value: 412000, color: "#8b5cf6", icon: "🌐", delta: 14.2 },
          { label: "Публикаций", value: 148, color: "#3b82f6", icon: "🖼️", mode: "num" },
          { label: "Вовлечённость", value: 7.4, suffix: "%", color: "#22c55e", icon: "❤️", mode: "num" },
          { label: "Переходы в бот", value: 3120, color: "#f97316", icon: "🤖", mode: "num" },
          { label: "Заказы из Instagram", value: 214, color: "#14b8a6", icon: "🛒", mode: "num" },
        ]}
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold mb-4">Контент-план недели</h3>
          <div className="flex flex-col gap-3">
            {PLAN.map(([day, title, color, status]) => (
              <div key={day} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                <div className="w-11 h-11 rounded-2xl grid place-items-center font-semibold text-sm" style={{ background: `color-mix(in srgb, ${color} 22%, transparent)`, color }}>
                  {day}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{title}</div>
                  <Progress value={status === "Готово" ? 100 : status === "На модерации" ? 70 : 35} color={color} />
                </div>
                <Badge color={color}>{status}</Badge>
              </div>
            ))}
          </div>
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
          <div className="mt-4 grid gap-2">
            {blocks.map((b) => (
              <ContentCard key={b.id} id={b.id} title={b.title} body={b.body} enabled={b.enabled} />
            ))}
          </div>
          <ActionButton className="w-full justify-center mt-4" message="Изображения подготовлены: 9 макетов в фирменном стиле DELIS">
            Подготовить изображения
          </ActionButton>
        </Card>
      </div>
    </>
  );
}
