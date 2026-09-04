"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, CreditCard, Mail, MessageSquare, CheckCircle2, XCircle, Zap, Send, AlertTriangle, Trash2 } from "lucide-react";
import { Card, PageHeader, Badge, Modal } from "@/shared/ui/kit";
import { dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { useT } from "@/shared/i18n/useT";

interface IntegrationLite {
  id: number; key: string; title: string; enabled: boolean;
  credentials: Record<string, string>; status: string; lastCheckAt: string | null;
}

const CONFIG: Record<string, { icon: typeof Bot; color: string; desc: string; fields: { key: string; label: string; placeholder: string; secret?: boolean }[]; help: string }> = {
  telegram_bot: {
    icon: Bot, color: "#0ea5e9",
    desc: "Отправка статусов заказов, чеков и уведомлений клиентам в Telegram",
    fields: [{ key: "token", label: "Bot Token", placeholder: "1234567890:AAExxxxxxxxxxxxxxxxxxxxxx", secret: true }],
    help: "Откройте @BotFather → /newbot → скопируйте токен",
  },
  click: {
    icon: CreditCard, color: "#3b82f6",
    desc: "Приём платежей через Click — популярная платёжная система Узбекистана",
    fields: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "12345" },
      { key: "service_id", label: "Service ID", placeholder: "67890" },
      { key: "secret_key", label: "Secret Key", placeholder: "xxxxxxxxxxxx", secret: true },
    ],
    help: "Получите ключи в личном кабинете merchant.click.uz",
  },
  payme: {
    icon: CreditCard, color: "#22c55e",
    desc: "Приём платежей через Payme (Paycom)",
    fields: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "5e730e8e0b852a417aa49ceb" },
      { key: "key", label: "Ключ мерчанта", placeholder: "xxxxxxxxxxxx", secret: true },
    ],
    help: "Кабинет мерчанта: business.payme.uz",
  },
  uzum: {
    icon: CreditCard, color: "#8b5cf6",
    desc: "Приём платежей через Uzum Bank",
    fields: [
      { key: "merchant_id", label: "Merchant ID", placeholder: "12345" },
      { key: "api_key", label: "API Key", placeholder: "xxxxxxxxxxxx", secret: true },
    ],
    help: "Обратитесь в Uzum Bank за ключами интеграции",
  },
  smtp: {
    icon: Mail, color: "#f97316",
    desc: "Отправка счетов, накладных и отчётов на email",
    fields: [
      { key: "host", label: "SMTP сервер", placeholder: "smtp.gmail.com" },
      { key: "port", label: "Порт", placeholder: "587" },
      { key: "user", label: "Логин / Email", placeholder: "info@delis.uz" },
      { key: "password", label: "Пароль приложения", placeholder: "••••••••", secret: true },
    ],
    help: "Для Gmail создайте «Пароль приложения» в настройках безопасности",
  },
  sms: {
    icon: MessageSquare, color: "#ec4899",
    desc: "SMS-уведомления клиентам о статусе заказа",
    fields: [
      { key: "email", label: "Email аккаунта Eskiz", placeholder: "info@delis.uz" },
      { key: "password", label: "Пароль API", placeholder: "••••••••", secret: true },
      { key: "sender", label: "Имя отправителя", placeholder: "DELIS" },
    ],
    help: "Зарегистрируйтесь на eskiz.uz и получите доступ к API",
  },
};

export function IntegrationsClient({ integrations, role }: { integrations: IntegrationLite[]; role: string }) {
  const [editing, setEditing] = useState<IntegrationLite | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const toast = useToast();
  const tr = useT();
  const router = useRouter();

  const canEdit = role === "owner" || role === "admin";
  const connected = integrations.filter((i) => i.enabled).length;

  const open = (i: IntegrationLite) => {
    setEditing(i);
    setForm(i.credentials ?? {});
    setTestResult(null);
  };

  const save = async (enable: boolean) => {
    if (!editing) return;
    setBusy(true);
    try {
      await postManage("saveIntegration", { key: editing.key, credentials: form, enabled: enable });
      toast(enable ? `${editing.title} подключён ✅` : `${editing.title} отключён`);
      setEditing(null);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const testTelegram = async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await postManage("testTelegram", { token: form.token ?? "" });
      const r = res as { username?: string; name?: string };
      setTestResult(`✅ Бот найден: @${r.username} (${r.name})`);
      toast("Соединение с Telegram успешно!");
    } catch (e) {
      setTestResult(`❌ ${e instanceof Error ? e.message : "Ошибка"}`);
      toast("Не удалось подключиться", "err");
    }
    setBusy(false);
  };

  const doReset = async () => {
    if (resetConfirm !== "УДАЛИТЬ") { toast("Введите слово УДАЛИТЬ для подтверждения", "err"); return; }
    setBusy(true);
    try {
      await postManage("resetOperationalData", { keepSettings: true });
      toast("Данные очищены — система готова к работе!");
      setResetModal(false);
      setResetConfirm("");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  return (
    <>
      <PageHeader
        title={tr("integrations.title")}
        subtitle={tr("integrations.subtitle")}
        actions={
          role === "owner" && (
            <button className="btn" style={{ color: "var(--error)", borderColor: "color-mix(in srgb, var(--error) 40%, transparent)" }} onClick={() => setResetModal(true)}>
              <Trash2 size={15} /> {tr("integrations.resetData")}
            </button>
          )
        }
      />

      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-4">
        {[
          { label: tr("integrations.total"), value: String(integrations.length), color: "#8b5cf6", icon: "🔌" },
          { label: tr("integrations.connected"), value: String(connected), color: "#22c55e", icon: "✅" },
          { label: tr("integrations.notConfigured"), value: String(integrations.length - connected), color: "#f97316", icon: "⏳" },
          { label: tr("integrations.readiness"), value: `${Math.round((connected / integrations.length) * 100)}%`, color: "#3b82f6", icon: "📊" },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: s.color }}>{s.icon} {s.value}</div>
          </Card>
        ))}
      </div>

      {!canEdit && (
        <Card hover={false}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} color="#f97316" />
            <span className="text-sm">Настройка интеграций доступна только Owner и Admin</span>
          </div>
        </Card>
      )}

      <div className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((i, idx) => {
          const cfg = CONFIG[i.key] ?? CONFIG.telegram_bot;
          const Icon = cfg.icon;
          return (
            <Card key={i.id} delay={idx * 0.04}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${cfg.color} 18%, transparent)`, color: cfg.color }}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{i.title}</div>
                  <div className="text-xs muted mt-0.5 line-clamp-2">{cfg.desc}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Badge color={i.enabled ? "#22c55e" : i.status === "error" ? "#ef4444" : "#6b7280"}>
                  {i.enabled ? <><CheckCircle2 size={11} /> Подключён</> : <><XCircle size={11} /> Не подключён</>}
                </Badge>
                {i.lastCheckAt && <span className="text-[0.68rem] muted">{dt(i.lastCheckAt)}</span>}
              </div>

              <button className="btn w-full justify-center mt-4" onClick={() => open(i)} disabled={!canEdit}>
                <Zap size={14} /> {i.enabled ? tr("integrations.configure") : tr("integrations.connect")}
              </button>
            </Card>
          );
        })}
      </div>

      {/* Модалка настройки */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Настройка: ${editing.title}`}>
          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl p-3 text-xs muted" style={{ background: "rgba(var(--table-row))" }}>
              💡 {CONFIG[editing.key]?.help}
            </div>

            {CONFIG[editing.key]?.fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs muted uppercase tracking-wider block mb-1">{f.label}</label>
                <input
                  className="input font-mono text-sm"
                  type={f.secret ? "password" : "text"}
                  placeholder={f.placeholder}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}

            {editing.key === "telegram_bot" && (
              <>
                <button className="btn justify-center" disabled={busy} onClick={testTelegram}>
                  <Send size={14} /> {busy ? tr("settings.testing") : tr("integrations.testConnection")}
                </button>
                {testResult && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-3 text-sm"
                    style={{ background: testResult.startsWith("✅") ? "color-mix(in srgb, #22c55e 12%, transparent)" : "color-mix(in srgb, #ef4444 12%, transparent)" }}>
                    {testResult}
                  </motion.div>
                )}
              </>
            )}

            <div className="flex gap-2 mt-2">
              <button className="btn btn-primary flex-1 justify-center" disabled={busy} onClick={() => save(true)}>
                {busy ? "Сохраняем…" : "Сохранить и включить"}
              </button>
              {editing.enabled && (
                <button className="btn" disabled={busy} onClick={() => save(false)}>Отключить</button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Модалка сброса данных */}
      {resetModal && (
        <Modal open onClose={() => setResetModal(false)} title="⚠️ Сброс данных">
          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl p-4" style={{ background: "color-mix(in srgb, #ef4444 12%, transparent)", border: "1px solid color-mix(in srgb, #ef4444 35%, transparent)" }}>
              <div className="font-semibold text-sm mb-2" style={{ color: "var(--error)" }}>Будут удалены безвозвратно:</div>
              <ul className="text-xs muted space-y-1">
                <li>• Все заказы и позиции заказов</li>
                <li>• Все сообщения чата и переписка с агентами</li>
                <li>• Все визиты агентов и фотоотчёты</li>
                <li>• Все закупки, возвраты, доставки</li>
                <li>• Все финансовые операции</li>
                <li>• История склада, задачи, активность</li>
              </ul>
              <div className="font-semibold text-sm mt-3 mb-1" style={{ color: "var(--success)" }}>Останутся:</div>
              <ul className="text-xs muted space-y-1">
                <li>• Товары, клиенты, агенты, поставщики, курьеры</li>
                <li>• Пользователи и настройки интеграций</li>
                <li>• База знаний и промокоды</li>
              </ul>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Введите слово УДАЛИТЬ для подтверждения</label>
              <input className="input" placeholder="УДАЛИТЬ" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} />
            </div>

            <button className="btn justify-center" disabled={busy || resetConfirm !== "УДАЛИТЬ"}
              style={{ background: resetConfirm === "УДАЛИТЬ" ? "linear-gradient(120deg,#ef4444,#f97316)" : undefined, color: resetConfirm === "УДАЛИТЬ" ? "#fff" : undefined, borderColor: "transparent" }}
              onClick={doReset}>
              {busy ? "Очищаем…" : "Очистить и начать с чистого листа"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
