"use client";

/**
 * Клиентская часть Web Push: подписка/отписка браузера.
 *
 * applicationServerKey передаётся в формате base64url (так VAPID-ключ
 * приходит с сервера), а PushManager требует Uint8Array — отсюда
 * urlBase64ToUint8Array.
 */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export interface PushClientState {
  supported: boolean;
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  endpoint: string | null;
  error: string | null;
}

/** Текущее состояние подписки в этом браузере. */
export async function pushClientState(): Promise<PushClientState> {
  const reg = await registration();
  if (!reg || !("pushManager" in reg)) {
    return { supported: false, enabled: false, permission: "unsupported", endpoint: null, error: null };
  }
  const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  try {
    const sub = await reg.pushManager.getSubscription();
    return {
      supported: true,
      enabled: Boolean(sub),
      permission,
      endpoint: sub?.endpoint ?? null,
      error: null,
    };
  } catch {
    return { supported: true, enabled: false, permission, endpoint: null, error: null };
  }
}

/**
 * Запрашивает разрешение и подписывает браузер, затем сохраняет подписку
 * на сервере. Возвращает текст ошибки или null при успехе.
 */
export async function subscribeToPush(publicKey: string): Promise<string | null> {
  const reg = await registration();
  if (!reg || !("pushManager" in reg)) return "Браузер не поддерживает push-уведомления";
  if (!publicKey) return "Push не настроен на сервере (нет VAPID-ключа)";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "Разрешение на уведомления не выдано";

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "subscribe",
      subscription: sub.toJSON(),
    }),
  });
  if (!res.ok) return "Не удалось сохранить подписку на сервере";
  return null;
}

/** Отписывает браузер и удаляет подписку на сервере. */
export async function unsubscribeFromPush(): Promise<void> {
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await sub.unsubscribe();
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }),
    });
  }
}
