export const money = (v: number | string, currency = "UZS") => {
  const n = Number(v || 0);
  const s = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
  return currency === "UZS" ? `${s} сум` : `${s} ${currency}`;
};

export const compact = (v: number | string) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} млрд`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)} тыс`;
  return String(Math.round(n));
};

export const num = (v: number | string) =>
  new Intl.NumberFormat("ru-RU").format(Number(v || 0));

/**
 * Процент изменения текущего значения к прошлому, округлённый до десятых.
 * Возвращает `null`, когда сравнение некорректно (нет прошлого значения,
 * оно равно нулю или не является числом) — тогда дельту лучше не показывать.
 */
export const pctChange = (current: number | string, previous: number | string): number | null => {
  const cur = Number(current);
  const prev = Number(previous);
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
};

export const dt = (v: Date | string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const dateOnly = (v: Date | string | null | undefined) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
};

export const timeOnly = (v: Date | string | null | undefined) =>
  v ? new Date(v).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";

export const ORDER_STATUSES: { key: string; label: string; color: string }[] = [
  { key: "new", label: "Новый", color: "#3b82f6" },
  { key: "confirmed", label: "Подтверждён", color: "#6366f1" },
  { key: "processing", label: "В работе", color: "#8b5cf6" },
  { key: "paid", label: "Оплачен", color: "#14b8a6" },
  { key: "packed", label: "Собран", color: "#0ea5e9" },
  { key: "courier", label: "У курьера", color: "#f59e0b" },
  { key: "shipped", label: "Отправлен", color: "#f97316" },
  { key: "delivered", label: "Доставлен", color: "#22c55e" },
  { key: "cancelled", label: "Отменён", color: "#ef4444" },
  { key: "returned", label: "Возврат", color: "#a855f7" },
];

export const statusMeta = (key: string) =>
  ORDER_STATUSES.find((s) => s.key === key) ?? { key, label: key, color: "#8b5cf6" };

export const SOURCE_LABEL: Record<string, string> = {
  telegram: "Telegram Bot",
  miniapp: "Mini App",
  website: "Сайт",
  instagram: "Instagram",
  facebook: "Facebook",
  agent: "Агент",
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  warehouse: "Warehouse",
  agent: "Agent",
  support: "Support",
  moderator: "Moderator",
  operator: "Operator",
};
