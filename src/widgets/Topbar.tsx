"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Bell, Sun, Moon, MonitorSmartphone, Menu, X, Plus, Languages, Smartphone } from "lucide-react";
import { useTheme } from "@/shared/store/theme";
import { NAV, navForRole } from "@/shared/config/nav";
import { CommandPalette } from "./CommandPalette";
import { Avatar } from "@/shared/ui/kit";
import { useKeyboardShortcuts } from "@/shared/lib/keyboard";
import { useT } from "@/shared/i18n/useT";
import { LOCALES, type Locale } from "@/shared/i18n/locales";
import { useLocale } from "@/shared/store/locale";
import { useToast } from "@/shared/ui/Toast";
import { useLiveNotifications, type LiveActivity } from "@/shared/lib/live";

export function Topbar({ user }: { user: { name: string; login: string; email: string; role: string } }) {
  const [cmd, setCmd] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const router = useRouter();
  const { mode, set } = useTheme();
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  const t = useT();
  useKeyboardShortcuts();
  const current = NAV.find((n) => n.href === pathname);
  const allowedNav = navForRole(user.role);

  const nextMode = mode === "dark" ? "light" : mode === "light" ? "auto" : "dark";
  const ModeIcon = mode === "dark" ? Moon : mode === "light" ? Sun : MonitorSmartphone;

  const NOTIFS = [
    { title: t("topbar.notif1title"), body: t("topbar.notif1body"), color: "#22c55e" },
    { title: t("topbar.notif2title"), body: t("topbar.notif2body"), color: "#f97316" },
    { title: t("topbar.notif3title"), body: t("topbar.notif3body"), color: "#3b82f6" },
    { title: t("topbar.notif4title"), body: t("topbar.notif4body"), color: "#8b5cf6" },
  ];

  // Живая лента: новые события приходят по SSE и всплывают тостом, если
  // панель уведомлений закрыта — так алерт виден без обновления страницы.
  const toast = useToast();
  const bellOpenRef = useRef(false);
  useEffect(() => {
    bellOpenRef.current = bell;
  }, [bell]);
  const lastToastId = useRef(0);
  const { items, unread, resetUnread } = useLiveNotifications((item: LiveActivity) => {
    if (!bellOpenRef.current) {
      lastToastId.current = item.id;
      toast(`${item.actor}: ${item.action}`, "ok");
    }
  });

  // Тосты на события из снимка не шлём: помечаем его вершину «уже увиденной».
  useEffect(() => {
    if (items.length > 0 && lastToastId.current === 0) {
      lastToastId.current = items[0].id;
    }
  }, [items]);

  const liveNotifs = items.slice(0, 6).map((a) => ({
    id: a.id,
    title: a.actor,
    body: `${a.action} — ${a.entity}`,
    color: "#8b5cf6",
  }));
  const bellItems = liveNotifs.length > 0 ? liveNotifs : NOTIFS;

  return (
    <>
      <div className="no-print sticky top-0 z-50 px-2 sm:px-4 pt-3 sm:pt-4">
        <div className="glass flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 h-[58px] sm:h-[62px]">
          {/* Гамбургер — виден до lg, чтобы не пересекаться с хлебными крошками (тоже до lg) */}
          <button className="btn lg:hidden !px-2.5 shrink-0" onClick={() => setMenu(true)}>
            <Menu size={18} />
          </button>

          {/* Хлебные крошки — только на широких экранах (lg+), где уже точно есть место */}
          <div className="hidden lg:flex flex-col leading-4 shrink-0 max-w-[180px]">
            <span className="text-[0.65rem] muted tracking-[0.12em] uppercase truncate">{current ? t(`group.${current.group}`) : "DELIS"}</span>
            <span className="text-sm font-semibold truncate">{current ? t(`nav.${current.labelKey}`) : t("nav.dashboard")}</span>
          </div>

          {/* Поиск — сжимается, никогда не выталкивает соседние кнопки */}
          <button
            onClick={() => setCmd(true)}
            className="flex-1 min-w-0 max-w-xl mx-auto flex items-center gap-2 px-3 sm:px-4 h-9 sm:h-10 rounded-full text-left"
            style={{ background: "rgba(var(--surface),0.6)", border: "1px solid rgba(var(--border))" }}
          >
            <Search size={15} className="muted shrink-0" />
            <span className="muted text-[0.8rem] flex-1 truncate hidden xs:inline">{t("topbar.search")}</span>
            <span className="chip muted hidden md:inline shrink-0">⌘K</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link href="/orders" className="btn btn-primary hidden xl:inline-flex shrink-0">
              <Plus size={15} /> {t("topbar.newOrder")}
            </Link>

            {/* Приложение для агентов */}
            <Link
              href="/agent-portal"
              className="btn hidden md:inline-flex shrink-0"
              title="Мобильный кабинет агента / B2B-Catalog"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, transparent), color-mix(in srgb, var(--accent) 25%, transparent))",
                borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              <Smartphone size={14} className="shrink-0" />
              <span className="hidden lg:inline">Кабинет агента</span>
            </Link>

            {/* Язык */}
            <div className="relative shrink-0">
              <button className="btn !px-2.5" onClick={() => setLangOpen((v) => !v)} title={t("topbar.language")}>
                <Languages size={16} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    className="glass card-pad !p-1.5 absolute right-0 mt-2 w-44 z-50"
                  >
                    {Object.entries(LOCALES).map(([code, l]) => (
                      <button
                        key={code}
                        onClick={() => { setLocale(code as Locale); setLangOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[0.82rem]"
                        style={{ background: locale === code ? "rgba(var(--table-row))" : "transparent", color: locale === code ? "var(--primary)" : "inherit", fontWeight: locale === code ? 600 : 400 }}
                      >
                        <span className="text-base">{l.flag}</span> {l.nativeName}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="btn !px-2.5 hidden sm:inline-flex" onClick={() => set({ mode: nextMode })} title={`${t("topbar.theme")}: ${mode}`}>
              <ModeIcon size={17} />
            </button>

            <div className="relative shrink-0">
              <button className="btn !px-2.5 relative" onClick={() => { setBell((v) => !v); resetUnread(); }}>
                <Bell size={17} />
                {unread > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[0.65rem] font-bold grid place-items-center text-white" style={{ background: "var(--error)" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: "var(--error)" }} />
                )}
              </button>
              <AnimatePresence>
                {bell && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    className="glass card-pad absolute right-0 mt-2 w-72 sm:w-80 z-50"
                  >
                    <div className="text-sm font-semibold mb-3">{t("topbar.notifications")}</div>
                    {bellItems.map((n, i) => (
                      <motion.div key={n.title + i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3 py-2.5">
                        <span className="w-1.5 rounded-full shrink-0" style={{ background: n.color }} />
                        <div className="min-w-0">
                          <div className="text-[0.82rem] font-medium truncate">{n.title}</div>
                          <div className="text-xs muted truncate">{n.body}</div>
                        </div>
                      </motion.div>
                    ))}
                    <Link href="/notifications" className="btn w-full justify-center mt-2" onClick={() => setBell(false)}>
                      {t("topbar.allNotifications")}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative shrink-0">
              <button className="flex items-center gap-2 pl-0.5" onClick={() => setProfile((v) => !v)}>
                <Avatar name={user.name} color="var(--primary)" size={34} />
                <span className="hidden 2xl:block leading-4 text-left max-w-[110px]">
                  <span className="block text-[0.8rem] font-semibold truncate">{user.name.split(" ")[0]}</span>
                  <span className="block text-[0.68rem] muted capitalize truncate">{user.role}</span>
                </span>
              </button>
              <AnimatePresence>
                {profile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    className="glass card-pad absolute right-0 mt-2 w-64 z-50"
                  >
                    <div className="flex items-center gap-3 pb-3 mb-3" style={{ borderBottom: "1px solid rgba(var(--border))" }}>
                      <Avatar name={user.name} color="var(--primary)" size={40} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{user.name}</div>
                        <div className="text-xs muted truncate">@{user.login}{user.email ? ` · ${user.email}` : ""}</div>
                      </div>
                    </div>
                    <Link href="/settings" className="btn w-full justify-center mb-2" onClick={() => setProfile(false)}>
                      {t("topbar.profileSettings")}
                    </Link>
                    <Link href="/agent-portal" target="_blank" className="btn w-full justify-center mb-2" onClick={() => setProfile(false)} style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "#fff", borderColor: "transparent" }}>
                      <Smartphone size={15} /> Приложение для агентов
                    </Link>
                    <button
                      className="btn w-full justify-center"
                      style={{ color: "var(--error)" }}
                      onClick={async () => {
                        await fetch("/api/auth/logout", { method: "POST" });
                        // Без refresh() в кеше роутера остались бы страницы
                        // предыдущего пользователя.
                        router.replace("/");
                        router.refresh();
                      }}
                    >
                      {t("topbar.logout")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] lg:hidden"
            style={{ background: "rgba(2,2,8,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => setMenu(false)}
          >
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="glass h-full w-[278px] p-3 overflow-y-auto no-scrollbar"
              style={{ borderRadius: "0 var(--radius) var(--radius) 0" }}
            >
              <div className="flex items-center justify-between px-2 py-3">
                <span className="font-semibold grad-text">DELIS CRM</span>
                <button className="btn !px-2" onClick={() => setMenu(false)}>
                  <X size={16} />
                </button>
              </div>
              <Link href="/agent-portal" onClick={() => setMenu(false)} className="flex items-center gap-3 px-3 py-3 rounded-2xl text-[0.86rem] mb-2" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 30%, transparent), color-mix(in srgb, var(--accent) 30%, transparent))", color: "#fff", border: "1px solid color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                <Smartphone size={18} /> <b>Мобильный кабинет агента</b>
              </Link>
              {allowedNav.map((n) => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[0.86rem]"
                    style={{
                      color: pathname === n.href ? "#fff" : "var(--muted)",
                      background: pathname === n.href ? "linear-gradient(110deg,var(--primary),var(--accent))" : "transparent",
                    }}
                  >
                    <Icon size={17} /> {t(`nav.${n.labelKey}`)}
                  </Link>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette open={cmd} setOpen={setCmd} />
    </>
  );
}
