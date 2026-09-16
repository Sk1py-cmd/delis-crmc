import { getKnowledgeBase } from "@/server/queries";
import { KnowledgeClient } from "./KnowledgeClient";
import { requireAccess } from "@/server/guard";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  await requireAccess("/knowledge");
  const rows = await getKnowledgeBase();
  return (
    <KnowledgeClient
      articles={rows.map((a) => ({
        id: a.id, title: a.title, category: a.category, content: a.content,
        icon: a.icon, views: a.views, isPinned: a.isPinned,
        createdBy: a.createdBy, updatedAt: String(a.updatedAt),
      }))}
    />
  );
}
