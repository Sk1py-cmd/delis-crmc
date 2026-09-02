"use client";

import { useSyncExternalStore } from "react";

/**
 * Текущее время как «внешний источник» для React.
 *
 * Время — это внешнее изменяемое состояние, поэтому читаем его через
 * useSyncExternalStore, а не через useEffect + setState: это не нарушает
 * правила чистоты React (Date.now() прямо в рендере) и не вызывает
 * каскадных ререндеров.
 *
 * На сервере и на первом клиентском рендере возвращается 0 — разметка
 * совпадает и гидратация проходит без предупреждений. Реальное время
 * появляется сразу после подписки (т.е. после монтирования), поэтому
 * вычисления вида «просрочено» должны учитывать значение 0 как «ещё не знаем».
 */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let snapshot = 0;

/** Шаг общего таймера: все подписчики обновляются одновременно. */
const TICK_MS = 30_000;

function subscribe(cb: () => void) {
  listeners.add(cb);

  if (!timer) {
    // Подписка происходит после монтирования — здесь Date.now() безопасен.
    snapshot = Date.now();
    timer = setInterval(() => {
      snapshot = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }

  // Первый подписчик мог смонтироваться уже после старта таймера.
  cb();

  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => 0;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
