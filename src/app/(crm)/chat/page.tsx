import { getChatThreads } from "@/server/queries";
import { ChatClient } from "./ChatClient";
import { requireAccess } from "@/server/guard";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  await requireAccess("/chat");
  const sp = await searchParams;
  const rows = await getChatThreads();
  const threads = rows.map((t) => ({
    id: t.id,
    name: t.name,
    username: t.username,
    city: t.city,
    isVip: t.isVip,
    source: t.source,
    last: t.last,
    lastAt: t.lastAt ? String(t.lastAt) : null,
    unread: String(t.unread),
  }));
  return <ChatClient threads={threads} initialId={sp.customer ? Number(sp.customer) : undefined} />;
}
