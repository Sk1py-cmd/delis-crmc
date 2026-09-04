"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Живая лента событий поверх SSE (`/api/events`).
 *
 * EventSource сам переподключается при обрыве и доставляет события,
 * накопившиеся за время разрыва (по `Last-Event-ID`). Начальный снимок
 * приходит отдельным событием `snapshot`, каждое новое — событием
 * `activity`.
 */

export interface LiveActivity {
  id: number;
  actor: string;
  action: string;
  entity: string;
  createdAt: string;
}

export function useLiveNotifications(onEvent?: (item: LiveActivity) => void) {
  const [items, setItems] = useState<LiveActivity[]>([]);
  const [unread, setUnread] = useState(0);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let es: EventSource | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed || typeof EventSource === "undefined") return;
      es = new EventSource("/api/events");

      es.addEventListener("snapshot", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as LiveActivity[];
          setItems(data);
        } catch {
          /* битые данные пропускаем */
        }
      });

      es.addEventListener("activity", (ev) => {
        try {
          const item = JSON.parse((ev as MessageEvent).data) as LiveActivity;
          setItems((prev) => [item, ...prev].slice(0, 20));
          setUnread((u) => u + 1);
          onEventRef.current?.(item);
        } catch {
          /* битые данные пропускаем */
        }
      });

      // При ошибке EventSource переподключится сам — намеренно не трогаем.
      es.onerror = () => {};
    };

    connect();
    return () => {
      disposed = true;
      es?.close();
    };
  }, []);

  const resetUnread = () => setUnread(0);

  return { items, unread, resetUnread };
}
