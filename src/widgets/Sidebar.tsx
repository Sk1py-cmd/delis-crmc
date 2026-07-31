"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_GROUPS, navForRole } from "@/shared/config/nav";
import { useTheme } from "@/shared/store/theme";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { useT } from "@/shared/i18n/useT";

export function Sidebar({ role = "owner" }: { role?: string }) {
  const items = navForRole(role);
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useTheme();
  const t = useT();
  const w = sidebarCollapsed ? 84 : 264;

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="no-print hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-40 py-4 pl-4"
      style={{ width: w }}
    >
      <div
        className="glass flex flex-col h-full overflow-hidden"
        style={{ background: "rgba(var(--sidebar), calc(var(--glass) + 0.2))" }}
      >
        <div className="flex items-center gap-3 px-4 h-[68px] shrink-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))", boxShadow: "0 10px 26px -12px var(--primary)" }}
          >
            <Sparkles size={20} color="#fff" />
          </div>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                <div className="font-semibold tracking-tight leading-4">DELIS</div>
                <div className="text-[0.68rem] muted tracking-[0.18em]">ENTERPRISE CRM</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 pb-3">
          {NAV_GROUPS.filter((group) => items.some((n) => n.group === group)).map((group) => (
            <div key={group} className="mb-2">
              {!sidebarCollapsed && (
                <div className="px-3 pt-3 pb-1.5 text-[0.64rem] uppercase tracking-[0.14em] muted font-semibold">{t(`group.${group}`)}</div>
              )}
              {items.filter((n) => n.group === group).map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                const label = t(`nav.${item.labelKey}`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={label}
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-0.5 group"
                    style={{ color: active ? "#fff" : "var(--muted)" }}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: "linear-gradient(110deg, color-mix(in srgb, var(--primary) 90%, transparent), color-mix(in srgb, var(--accent) 75%, transparent))",
                          boxShadow: "0 14px 30px -16px var(--primary)",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    <Icon size={18} className="relative z-10 shrink-0 transition-transform group-hover:scale-110" />
                    {!sidebarCollapsed && (
                      <span className="relative z-10 text-[0.855rem] font-medium whitespace-nowrap">{label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <button onClick={toggleSidebar} className="btn m-3 justify-center">
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!sidebarCollapsed && t("sidebar.collapse")}
        </button>
      </div>
    </motion.aside>
  );
}
