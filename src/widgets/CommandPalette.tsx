"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { NAV } from "@/shared/config/nav";
import { useT } from "@/shared/i18n/useT";

export interface SearchHit {
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const t = useT();

  const navHits: SearchHit[] = NAV.filter((n) => t(`nav.${n.labelKey}`).toLowerCase().includes(q.toLowerCase())).map((n) => ({
    type: t("nav.section") || "Раздел",
    title: t(`nav.${n.labelKey}`),
    subtitle: t(`group.${n.group}`),
    href: n.href,
  }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { hits: SearchHit[] }) => setHits(d.hits ?? []))
        .catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const all = [...navHits, ...hits].slice(0, 14);

  const go = useCallback(
    (h: SearchHit) => {
      setOpen(false);
      setQ("");
      router.push(h.href);
    },
    [router, setOpen],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
          style={{ background: "rgba(2,2,8,0.55)", backdropFilter: "blur(10px)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: -14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: "rgba(var(--border))" }}>
              <Search size={18} className="muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, all.length - 1));
                  if (e.key === "ArrowUp") setIdx((i) => Math.max(0, i - 1));
                  if (e.key === "Enter" && all[idx]) go(all[idx]);
                }}
                placeholder="Поиск по товарам, заказам, клиентам, агентам, разделам…"
                className="flex-1 bg-transparent outline-none text-[0.95rem]"
              />
              <span className="chip muted">ESC</span>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {all.length === 0 && <div className="muted text-sm p-6 text-center">Начните вводить запрос — Ctrl + K</div>}
              {all.map((h, i) => (
                <motion.button
                  key={`${h.type}-${h.href}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(h)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                  style={{ background: i === idx ? "rgba(var(--table-row))" : "transparent" }}
                >
                  <span className="chip" style={{ color: "var(--primary)", borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                    {h.type}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{h.title}</span>
                    <span className="block text-xs muted truncate">{h.subtitle}</span>
                  </span>
                  {i === idx && <CornerDownLeft size={15} className="muted" />}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
