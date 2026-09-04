import { afterEach, describe, expect, it } from "vitest";
import { pushConfigured, sendPushToAll, vapidPublicKey } from "@/server/webpush";

/**
 * Гейтинг push-логики по переменным окружения. Сама отправка идёт через
 * библиотеку web-push и в юнит-тестах не вызывается (нужен живой push-сервис),
 * но важно, что без VAPID-ключей ничего не уходит и ничего не падает.
 */

const KEYS = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
const saved: Record<string, string | undefined> = {};

function clearVapid() {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
}

function setVapid() {
  process.env.VAPID_PUBLIC_KEY = "BPUB";
  process.env.VAPID_PRIVATE_KEY = "BPRIV";
  process.env.VAPID_SUBJECT = "mailto:admin@example.com";
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("pushConfigured", () => {
  it("false без ключей", () => {
    clearVapid();
    expect(pushConfigured()).toBe(false);
    expect(vapidPublicKey()).toBe("");
  });

  it("true, когда все три переменные заданы", () => {
    setVapid();
    expect(pushConfigured()).toBe(true);
    expect(vapidPublicKey()).toBe("BPUB");
  });

  it("false при неполном наборе", () => {
    clearVapid();
    process.env.VAPID_PUBLIC_KEY = "BPUB";
    expect(pushConfigured()).toBe(false);
  });
});

describe("sendPushToAll", () => {
  it("без конфигурации возвращает 0 и не падает", async () => {
    clearVapid();
    await expect(sendPushToAll({ title: "t", body: "b" })).resolves.toBe(0);
  });
});
