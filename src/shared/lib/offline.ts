"use client";

const DB_NAME = "delis_agent_offline";
const DB_VERSION = 1;
const STORE_PRODUCTS = "cached_products";
const STORE_ORDERS = "offline_orders";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_ORDERS)) {
        const os = db.createObjectStore(STORE_ORDERS, { keyPath: "id", autoIncrement: true });
        os.createIndex("synced", "synced", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ═══ КЭШИРОВАНИЕ ТОВАРОВ ═══
export async function cacheProducts(products: unknown[]) {
  if (products.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, "readwrite");
    const store = tx.objectStore(STORE_PRODUCTS);
    await new Promise<void>((res, rej) => {
      store.clear();
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    for (const p of products) store.put(p);
    await new Promise((res) => (tx.oncomplete = res));
    db.close();
  } catch {
    /* IndexedDB недоступен (например в SSR) */
  }
}

export async function getCachedProducts(): Promise<unknown[]> {
  try {
    const db = await openDB();
    const store = db.transaction(STORE_PRODUCTS, "readonly").objectStore(STORE_PRODUCTS);
    const items = await new Promise<unknown[]>((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result ?? []);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return items;
  } catch {
    return [];
  }
}

// ═══ ОФФЛАЙН-ЗАКАЗЫ ═══
export async function saveOfflineOrder(payload: {
  agentId: number;
  storeName: string;
  storeAddress: string;
  items: { productId: number; qty: number }[];
  notes: string;
}) {
  try {
    const db = await openDB();
    const store = db.transaction(STORE_ORDERS, "readwrite").objectStore(STORE_ORDERS);
    store.add({ ...payload, synced: false, createdAt: new Date().toISOString() });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function getPendingOrders(): Promise<
  (Record<string, unknown> & { id: number; synced: boolean })[]
> {
  try {
    const db = await openDB();
    const store = db.transaction(STORE_ORDERS, "readonly").objectStore(STORE_ORDERS);
    const all = await new Promise<unknown[]>((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result ?? []);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return (all as (Record<string, unknown> & { id: number; synced: boolean })[]).filter(
      (o) => !o.synced,
    );
  } catch {
    return [];
  }
}

export async function markOrderSynced(id: number) {
  try {
    const db = await openDB();
    const store = db.transaction(STORE_ORDERS, "readwrite").objectStore(STORE_ORDERS);
    const req = store.get(id);
    const item = await new Promise<unknown>((res) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    });
    if (item && typeof item === "object" && "synced" in item) {
      (item as Record<string, unknown>).synced = true;
      store.put(item);
    }
    db.close();
  } catch {
    /* */
  }
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}
