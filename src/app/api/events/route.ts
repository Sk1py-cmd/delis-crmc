import { NextRequest } from "next/server";
import { desc, gt } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Live-лента событий по Server-Sent Events (SSE).
 *
 * Раньше уведомления обновлялись только перезагрузкой страницы. Здесь
 * соединение держится открытым, и новые записи таблицы `activity` (входы,
 * смена статусов, создание заказов и т.п.) приходят в браузер мгновенно.
 *
 * Выбран SSE, а не WebSocket: для WebSocket нужен отдельный сервер, а
 * SSE — обычный route handler Next.js, который работает на Vercel без
 * дополнительной инфраструктуры. EventSource сам переподключается при
 * обрыве и умеет кэшировать непрочитанные события по `id`.
 */

const encoder = new TextEncoder();
const POLL_MS = 3000;
const HEARTBEAT_MS = 15_000;

function frame(event: string, id: number, data: unknown): string {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response("Требуется авторизация", { status: 401 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const close = () => {
        closed = true;
        try {
          controller.close();
        } catch {
          /* уже закрыт */
        }
      };

      // Возобновление после обрыва: EventSource присылает Last-Event-ID.
      const headerId = Number(req.headers.get("last-event-id"));
      let lastId = Number.isFinite(headerId) && headerId > 0 ? headerId : 0;

      // Начальный снимок последних событий, чтобы лента не была пустой.
      try {
        const recent = await db
          .select()
          .from(s.activity)
          .orderBy(desc(s.activity.createdAt))
          .limit(10);
        const snapshot = recent.slice().reverse();
        for (const row of snapshot) {
          lastId = Math.max(lastId, row.id);
          send(frame("snapshot", row.id, row));
        }
      } catch {
        send(`event: error\ndata: ${JSON.stringify({ message: "Не удалось прочитать ленту" })}\n\n`);
      }

      const tick = async () => {
        try {
          const rows = await db
            .select()
            .from(s.activity)
            .where(gt(s.activity.id, lastId))
            .orderBy(s.activity.id)
            .limit(50);
          for (const row of rows) {
            lastId = Math.max(lastId, row.id);
            send(frame("activity", row.id, row));
          }
        } catch {
          /* пропускаем неудачный тик — следующая попытка повторится */
        }
      };

      const interval = setInterval(tick, POLL_MS);
      const heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);

      const abort = () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        close();
      };
      req.signal.addEventListener("abort", abort);
      if (req.signal.aborted) abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
