"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, PageHeader, Badge, Modal, Avatar } from "@/shared/ui/kit";
import { useTheme, PRESET_PRIMARY, ThemeMode, Density } from "@/shared/store/theme";
import {
  Moon, Sun, MonitorSmartphone, RotateCcw, User, Lock, BellRing, Bell,
  KeyRound, Eye, EyeOff, LogOut, Send, Smartphone, CheckCircle2, Pencil,
} from "lucide-react";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { ROLE_LABEL } from "@/shared/lib/format";
import { useT } from "@/shared/i18n/useT";
import { useLocale } from "@/shared/store/locale";
import { LOCALES, type Locale } from "@/shared/i18n/locales";
import { subscribeToPush, unsubscribeFromPush, pushClientState } from "@/shared/lib/browserPush";
import { Languages } from "lucide-react";

const MODES: { key: ThemeMode; label: string; icon: typeof Moon }[] = [
  { key: "dark", label: "Dark", icon: Moon },
  { key: "light", label: "Light", icon: Sun },
  { key: "auto", label: "Auto", icon: MonitorSmartphone },
];

const DENSITY: { key: Density; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "comfortable", label: "Comfortable" },
  { key: "spacious", label: "Spacious" },
];

export interface SettingsUser {
  name: string;
  login: string;
  email: string;
  role: string;
}

export interface TelegramState {
  enabled: boolean;
  tokenSet: boolean;
  chatId: string;
}

export interface PushState {
  enabled: boolean;
  publicKey: string;
}

export function SettingsClient({ user, telegram, push }: { user: SettingsUser; telegram: TelegramState; push: PushState }) {
  const t = useTheme();
  const tt = useT();
  const { locale, setLocale } = useLocale();
  const toast = useToast();
  const router = useRouter();

  const [pwModal, setPwModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [newLogin, setNewLogin] = useState(user.login);

  const [tgChatId, setTgChatId] = useState(telegram.chatId);
  const [tgToken, setTgToken] = useState("");
  const [editToken, setEditToken] = useState(!telegram.tokenSet);
  const [tgTestResult, setTgTestResult] = useState<string | null>(null);

  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // Состояние браузерной подписки читаем на клиенте: сервер знает только
  // факт настройки VAPID, а подписан ли именно этот браузер — знает сам браузер.
  useEffect(() => {
    let alive = true;
    pushClientState().then((st) => {
      if (!alive) return;
      setPushSupported(st.supported);
      setPushSubscribed(st.enabled);
    });
    return () => {
      alive = false;
    };
  }, []);

  const enablePush = async () => {
    setPushBusy(true);
    const err = await subscribeToPush(push.publicKey);
    if (err) toast(err, "err");
    else {
      toast("Push-уведомления включены");
      setPushSubscribed(true);
    }
    setPushBusy(false);
  };

  const disablePush = async () => {
    setPushBusy(true);
    await unsubscribeFromPush();
    setPushSubscribed(false);
    toast("Push-уведомления выключены");
    setPushBusy(false);
  };

  const testTelegram = async () => {
    if (!tgToken.trim()) { toast("Введите токен бота для проверки", "err"); return; }
    setBusy(true);
    setTgTestResult(null);
    try {
      const res = await postManage("testTelegram", { token: tgToken.trim() });
      const r = res as { username?: string; name?: string };
      setTgTestResult(`✅ Бот найден: @${r.username} (${r.name})`);
    } catch (e) {
      setTgTestResult(`❌ ${e instanceof Error ? e.message : "Ошибка"}`);
    }
    setBusy(false);
  };

  const saveTgNotifications = async () => {
    if (!tgChatId.trim()) { toast("Укажите ваш Telegram Chat ID", "err"); return; }
    if (!telegram.tokenSet && !tgToken.trim()) { toast("Укажите токен бота", "err"); return; }
    setBusy(true);
    try {
      await postManage("setupOrderNotifications", { chatId: tgChatId.trim(), token: tgToken.trim() });
      toast("Уведомления подключены — тестовое сообщение отправлено в Telegram");
      setTgToken("");
      setEditToken(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const changePassword = async () => {
    if (!currentPw.trim() || !newPw.trim()) { toast("Заполните оба поля", "err"); return; }
    if (newPw.length < 4) { toast("Пароль минимум 4 символа", "err"); return; }
    setBusy(true);
    try {
      await postManage("changePassword", { currentPassword: currentPw, newPassword: newPw });
      toast("Пароль изменён. Используйте его при следующем входе");
      setPwModal(false);
      setCurrentPw("");
      setNewPw("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const changeLogin = async () => {
    const v = newLogin.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(v)) { toast("Логин: 3–24 символа, латиница/цифры/точка/дефис", "err"); return; }
    if (v === user.login) { toast("Это ваш текущий логин", "err"); return; }
    if (!currentPw.trim()) { toast("Введите текущий пароль для подтверждения", "err"); return; }
    setBusy(true);
    try {
      await postManage("changeLogin", { newLogin: v, currentPassword: currentPw });
      toast(`Логин изменён на @${v}. Входите с новым логином`);
      setLoginModal(false);
      setCurrentPw("");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("delis_token");
    // Без refresh() в кеше роутера остались бы страницы предыдущего
    // пользователя — после выхода их не должно быть видно.
    router.replace("/");
    router.refresh();
  };

  return (
    <>
      <PageHeader
        title={tt("settings.title")}
        subtitle={tt("settings.subtitle")}
        actions={
          <>
            <button className="btn" onClick={t.reset}>
              <RotateCcw size={15} /> {tt("settings.resetTheme")}
            </button>
            <button className="btn" onClick={logout} style={{ color: "var(--error)", borderColor: "color-mix(in srgb, var(--error) 35%, transparent)" }}>
              <LogOut size={15} /> {tt("settings.logout")}
            </button>
          </>
        }
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">

        {/* ─── Язык интерфейса ─── */}
        <Card>
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Languages size={17} color="var(--primary)" /> {tt("settings.language")}
          </h3>
          <p className="text-xs muted mb-4">{tt("settings.languageDesc")}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(LOCALES).map(([code, l]) => (
              <motion.button
                key={code}
                whileTap={{ scale: 0.96 }}
                onClick={() => setLocale(code as Locale)}
                className="rounded-2xl py-4 flex flex-col items-center gap-1.5 text-xs font-medium"
                style={{
                  background: locale === code ? "linear-gradient(135deg,var(--primary),var(--accent))" : "rgba(var(--table-row))",
                  color: locale === code ? "#fff" : "var(--muted)",
                  border: "1px solid rgba(var(--border))",
                }}
              >
                <span className="text-xl">{l.flag}</span> {l.nativeName}
              </motion.button>
            ))}
          </div>
        </Card>

        {/* ─── Аккаунт ─── */}
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User size={17} color="var(--primary)" /> {tt("settings.account")}
          </h3>

          <div className="flex items-center gap-3 mb-4">
            <Avatar name={user.name} color="var(--primary)" size={48} />
            <div className="min-w-0">
              <div className="font-semibold truncate">{user.name}</div>
              <Badge color="#8b5cf6">{ROLE_LABEL[user.role] ?? user.role}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
              <div className="min-w-0">
                <div className="text-[0.65rem] muted uppercase tracking-wider">{tt("settings.loginLabel")}</div>
                <div className="text-sm font-semibold font-mono truncate">@{user.login}</div>
              </div>
              <button className="btn !text-xs !py-1.5 shrink-0" onClick={() => { setNewLogin(user.login); setCurrentPw(""); setLoginModal(true); }}>
                <Pencil size={12} /> {tt("settings.changeLogin")}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
              <div className="min-w-0">
                <div className="text-[0.65rem] muted uppercase tracking-wider">{tt("settings.password")}</div>
                <div className="text-sm font-semibold tracking-widest">••••••••</div>
              </div>
              <button className="btn !text-xs !py-1.5 shrink-0" onClick={() => { setCurrentPw(""); setNewPw(""); setPwModal(true); }}>
                <KeyRound size={12} /> {tt("settings.changePassword")}
              </button>
            </div>

            {user.email && (
              <div className="rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
                <div className="text-[0.65rem] muted uppercase tracking-wider">{tt("settings.email")}</div>
                <div className="text-sm truncate">{user.email}</div>
              </div>
            )}
          </div>
        </Card>

        {/* ─── Telegram уведомления ─── */}
        <Card>
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <BellRing size={17} color="var(--warning)" /> {tt("settings.telegramNotif")}
          </h3>
          <p className="text-xs muted mb-4">{tt("settings.telegramDesc")}</p>

          {telegram.enabled && (
            <div className="rounded-2xl p-3 mb-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, #22c55e 12%, transparent)", border: "1px solid color-mix(in srgb, #22c55e 32%, transparent)" }}>
              <CheckCircle2 size={15} color="#22c55e" />
              <span className="text-xs">{tt("settings.telegramConnected")} {telegram.chatId}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs muted uppercase tracking-wider">{tt("settings.botToken")}</label>
                {telegram.tokenSet && !editToken && (
                  <button className="text-xs font-semibold" style={{ color: "var(--primary)" }} onClick={() => setEditToken(true)}>
                    {tt("settings.changeLogin")}
                  </button>
                )}
              </div>
              {telegram.tokenSet && !editToken ? (
                <div className="input flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} color="#22c55e" /> {tt("settings.tokenSaved")}
                </div>
              ) : (
                <input className="input font-mono text-sm" placeholder="1234567890:AAExxxxxxxx" value={tgToken} onChange={(e) => setTgToken(e.target.value)} />
              )}
              <p className="text-[0.65rem] muted mt-1">{tt("settings.tokenHint")}</p>
            </div>

            {(editToken || !telegram.tokenSet) && (
              <>
                <button className="btn justify-center" disabled={busy || !tgToken.trim()} onClick={testTelegram}>
                  <Smartphone size={14} /> {busy ? tt("settings.testing") : tt("settings.testBot")}
                </button>
                {tgTestResult && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-2.5 text-xs"
                    style={{ background: tgTestResult.startsWith("✅") ? "color-mix(in srgb, #22c55e 12%, transparent)" : "color-mix(in srgb, #ef4444 12%, transparent)" }}>
                    {tgTestResult}
                  </motion.div>
                )}
              </>
            )}

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">{tt("settings.chatId")}</label>
              <input className="input font-mono text-sm" placeholder="123456789" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} />
              <p className="text-[0.65rem] muted mt-1">{tt("settings.chatIdHint")}</p>
            </div>

            <button className="btn btn-primary justify-center" disabled={busy} onClick={saveTgNotifications}>
              <Send size={14} /> {busy ? tt("settings.connecting") : telegram.enabled ? tt("settings.updateNotif") : tt("settings.connectNotif")}
            </button>
          </div>
        </Card>

        {/* ─── Браузерные push-уведомления ─── */}
        <Card>
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Bell size={17} color="var(--success)" /> Push-уведомления
          </h3>
          <p className="text-xs muted mb-4">Мгновенные уведомления браузера о новых заказах и событиях CRM — даже когда вкладка закрыта.</p>

          {!push.enabled ? (
            <div className="rounded-2xl p-3 mb-3" style={{ background: "color-mix(in srgb, #f97316 12%, transparent)", border: "1px solid color-mix(in srgb, #f97316 32%, transparent)" }}>
              <p className="text-xs">Push не настроен на сервере: задайте VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY и VAPID_SUBJECT.</p>
            </div>
          ) : !pushSupported ? (
            <div className="rounded-2xl p-3 mb-3" style={{ background: "color-mix(in srgb, #ef4444 12%, transparent)", border: "1px solid color-mix(in srgb, #ef4444 32%, transparent)" }}>
              <p className="text-xs">Этот браузер не поддерживает push-уведомления (нужен HTTPS и service worker).</p>
            </div>
          ) : pushSubscribed ? (
            <>
              <div className="rounded-2xl p-3 mb-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, #22c55e 12%, transparent)", border: "1px solid color-mix(in srgb, #22c55e 32%, transparent)" }}>
                <CheckCircle2 size={15} color="#22c55e" />
                <span className="text-xs">Уведомления включены для этого браузера</span>
              </div>
              <button className="btn justify-center" disabled={pushBusy} onClick={disablePush}>
                Выключить уведомления
              </button>
            </>
          ) : (
            <>
              <p className="text-xs muted mb-3">Нажмите кнопку — браузер запросит разрешение на уведомления.</p>
              <button className="btn btn-primary justify-center" disabled={pushBusy} onClick={enablePush}>
                <BellRing size={14} /> {pushBusy ? "Подключаем…" : "Включить уведомления"}
              </button>
            </>
          )}
        </Card>

        {/* ─── Тема ─── */}
        <Card>
          <h3 className="font-semibold mb-3">{tt("settings.themeMode")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <motion.button key={m.key} whileTap={{ scale: 0.96 }} onClick={() => t.set({ mode: m.key })}
                  className="rounded-2xl py-4 flex flex-col items-center gap-2 text-xs font-medium"
                  style={{
                    background: t.mode === m.key ? "linear-gradient(135deg,var(--primary),var(--accent))" : "rgba(var(--table-row))",
                    color: t.mode === m.key ? "#fff" : "var(--muted)",
                    border: "1px solid rgba(var(--border))",
                  }}>
                  <Icon size={18} /> {m.label}
                </motion.button>
              );
            })}
          </div>

          <h3 className="font-semibold mt-6 mb-3">{tt("settings.density")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {DENSITY.map((d) => (
              <button key={d.key} onClick={() => t.set({ density: d.key })}
                className="rounded-2xl py-3 text-xs font-medium"
                style={{
                  background: t.density === d.key ? "linear-gradient(135deg,var(--primary),var(--accent))" : "rgba(var(--table-row))",
                  color: t.density === d.key ? "#fff" : "var(--muted)",
                  border: "1px solid rgba(var(--border))",
                }}>
                {d.label}
              </button>
            ))}
          </div>
        </Card>

        {/* ─── Цвета ─── */}
        <Card>
          <h3 className="font-semibold mb-3">{tt("settings.primaryColor")}</h3>
          <div className="flex flex-wrap gap-2">
            {PRESET_PRIMARY.map((c) => (
              <motion.button key={c} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
                onClick={() => t.set({ primary: c })} className="w-10 h-10 rounded-2xl"
                style={{ background: c, outline: t.primary === c ? "2px solid #fff" : "none", outlineOffset: 2 }} />
            ))}
          </div>
          <div className="mt-4">
            <label className="text-xs muted uppercase tracking-wider">{tt("settings.customColor")}</label>
            <input type="color" className="input mt-1.5 h-11 p-1" value={t.primary} onChange={(e) => t.set({ primary: e.target.value })} />
          </div>

          <h3 className="font-semibold mt-6 mb-3">{tt("settings.accentColor")}</h3>
          <div className="flex flex-wrap gap-2">
            {PRESET_PRIMARY.map((c) => (
              <motion.button key={c} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
                onClick={() => t.set({ accent: c })} className="w-10 h-10 rounded-2xl"
                style={{ background: c, outline: t.accent === c ? "2px solid #fff" : "none", outlineOffset: 2 }} />
            ))}
          </div>
        </Card>

        {/* ─── Геометрия ─── */}
        <Card>
          <h3 className="font-semibold mb-4">{tt("settings.glassGeometry")}</h3>
          <label className="text-xs muted uppercase tracking-wider">{tt("settings.transparency")} — {Math.round(t.glass * 100)}%</label>
          <input type="range" min={0.2} max={1} step={0.05} value={t.glass}
            onChange={(e) => t.set({ glass: Number(e.target.value) })} className="w-full mt-2 accent-[var(--primary)]" />
          <label className="text-xs muted uppercase tracking-wider block mt-5">{tt("settings.radius")} — {t.radius}px</label>
          <input type="range" min={8} max={36} step={2} value={t.radius}
            onChange={(e) => t.set({ radius: Number(e.target.value) })} className="w-full mt-2 accent-[var(--primary)]" />
          <div className="mt-6 p-4 rounded-3xl glass">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{tt("settings.preview")}</span>
              <Badge color="var(--primary)">Live</Badge>
            </div>
            <p className="muted text-xs mt-2">{tt("settings.previewDesc")}</p>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary !text-xs" onClick={() => t.set({ primary: "#8b5cf6", accent: "#3b82f6" })}>{tt("settings.resetColors")}</button>
              <button className="btn !text-xs" onClick={() => t.set({ radius: 24, glass: 0.55 })}>{tt("settings.resetShape")}</button>
            </div>
          </div>
        </Card>

        {/* ─── Интеграции ─── */}
        <Card>
          <h3 className="font-semibold mb-4">{tt("settings.integrations")}</h3>
          <div className="flex flex-col gap-2.5">
            {[
              { title: "Telegram Bot и платежи", desc: "Click · Payme · Uzum · SMS · Email", color: "#0ea5e9", href: "/integrations" },
              { title: "Telegram Mini App", desc: "Витрина, баннеры, каталог", color: "#8b5cf6", href: "/miniapp" },
              { title: "Официальный сайт", desc: "Страницы, SEO, публикация", color: "#22c55e", href: "/website" },
              { title: "Instagram", desc: "Контент-план и публикации", color: "#ec4899", href: "/instagram" },
            ].map((i) => (
              <Link key={i.title} href={i.href} className="rounded-2xl p-3 flex items-center justify-between gap-3"
                style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{i.title}</div>
                  <div className="text-xs muted truncate">{i.desc}</div>
                </div>
                <Badge color={i.color}>{tt("settings.open")}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Смена пароля */}
      {pwModal && (
        <Modal open onClose={() => setPwModal(false)} title={tt("settings.changePasswordTitle")}>
          <div className="flex flex-col gap-3.5">
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
              <input className="input !pl-10 !pr-10" type={showPw ? "text" : "password"} placeholder={tt("settings.currentPassword")}
                value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 muted" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <input className="input" type="password" placeholder={tt("settings.newPassword")}
              value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            <button className="btn btn-primary justify-center" disabled={busy} onClick={changePassword}>
              {busy ? tt("settings.saving") : tt("settings.changePasswordTitle")}
            </button>
          </div>
        </Modal>
      )}

      {/* Смена логина */}
      {loginModal && (
        <Modal open onClose={() => setLoginModal(false)} title={tt("settings.changeLoginTitle")}>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">{tt("settings.currentLogin")}</label>
              <div className="input font-mono text-sm opacity-60">@{user.login}</div>
            </div>
            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">{tt("settings.newLogin")}</label>
              <input className="input font-mono" placeholder="otabek" value={newLogin}
                onChange={(e) => setNewLogin(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} />
              <p className="text-xs muted mt-1">{tt("settings.newLoginHint")}</p>
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
              <input className="input !pl-10" type="password" placeholder={tt("settings.confirmPassword")}
                value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            </div>
            <button className="btn btn-primary justify-center" disabled={busy} onClick={changeLogin}>
              {busy ? tt("settings.saving") : tt("settings.changeLoginTitle")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
