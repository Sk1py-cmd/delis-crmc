"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Search, Pin, Eye, Trash2, Pencil, X } from "lucide-react";
import { Card, PageHeader, Badge, Modal, Tabs } from "@/shared/ui/kit";
import { dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { useT } from "@/shared/i18n/useT";

interface Article {
  id: number; title: string; category: string; content: string;
  icon: string; views: number; isPinned: boolean; createdBy: string; updatedAt: string;
}

const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  general: { label: "Общее", color: "#8b5cf6", icon: "📋" },
  sales: { label: "Продажи", color: "#22c55e", icon: "💰" },
  warehouse: { label: "Склад", color: "#f97316", icon: "📦" },
  agents: { label: "Агенты", color: "#3b82f6", icon: "🧑‍💼" },
  tech: { label: "Техническое", color: "#ec4899", icon: "⚙️" },
};

const ICONS = ["📄", "🧾", "📦", "🔄", "🧑‍💼", "💬", "🤖", "⚠️", "🔐", "💰", "📊", "🚚", "🎯", "✅", "📸", "🏭"];

export function KnowledgeClient({ articles }: { articles: Article[] }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [reading, setReading] = useState<Article | null>(null);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const tr = useT();
  const router = useRouter();

  const filtered = useMemo(
    () => articles.filter((a) =>
      (cat === "all" || a.category === cat) &&
      (q === "" || `${a.title} ${a.content}`.toLowerCase().includes(q.toLowerCase()))
    ),
    [articles, cat, q]
  );

  const save = async () => {
    if (!editing?.title?.trim()) { toast("Укажите заголовок", "err"); return; }
    setBusy(true);
    try {
      await postManage("saveArticle", {
        id: editing.id, title: editing.title, category: editing.category ?? "general",
        content: editing.content ?? "", icon: editing.icon ?? "📄", isPinned: editing.isPinned ?? false,
      });
      toast(editing.id ? "Статья обновлена" : "Статья добавлена в базу знаний");
      setEditing(null);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const remove = async (id: number) => {
    try {
      await postManage("deleteArticle", { id });
      toast("Статья удалена");
      setReading(null);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
  };

  return (
    <>
      <PageHeader
        title={tr("knowledge.title")}
        subtitle={tr("knowledge.subtitle")}
        actions={<button className="btn btn-primary" onClick={() => setEditing({ icon: "📄", category: "general" })}><Plus size={15} /> {tr("knowledge.newArticle")}</button>}
      />

      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-4">
        {[
          { label: tr("knowledge.totalArticles"), value: String(articles.length), color: "#8b5cf6", icon: "📚" },
          { label: tr("knowledge.pinned"), value: String(articles.filter((a) => a.isPinned).length), color: "#f97316", icon: "📌" },
          { label: tr("knowledge.views"), value: String(articles.reduce((s, a) => s + a.views, 0)), color: "#22c55e", icon: "👁️" },
          { label: tr("knowledge.categories"), value: String(Object.keys(CATEGORIES).length), color: "#3b82f6", icon: "🗂️" },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: s.color }}>{s.icon} {s.value}</div>
          </Card>
        ))}
      </div>

      <Card hover={false} className="flex flex-wrap items-center gap-3">
        <Tabs value={cat} onChange={setCat}
          items={[{ key: "all", label: tr("common.all") }, ...Object.entries(CATEGORIES).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` }))]} />
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
          <input className="input !pl-9" placeholder={tr("knowledge.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {filtered.map((a, i) => {
            const c = CATEGORIES[a.category] ?? CATEGORIES.general;
            return (
              <motion.div key={a.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} whileHover={{ y: -4 }}>
                <div className="glass card-pad h-full flex flex-col cursor-pointer" onClick={() => setReading(a)}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl grid place-items-center text-xl shrink-0" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)` }}>
                      {a.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm leading-snug line-clamp-2">{a.title}</div>
                      <Badge color={c.color}>{c.icon} {c.label}</Badge>
                    </div>
                    {a.isPinned && <Pin size={14} color="#f97316" className="shrink-0" />}
                  </div>

                  <p className="text-xs muted mt-3 line-clamp-3 flex-1">{a.content.slice(0, 140)}…</p>

                  <div className="flex items-center justify-between mt-4 pt-3 text-xs muted" style={{ borderTop: "1px solid rgba(var(--border))" }}>
                    <span className="flex items-center gap-1"><Eye size={12} /> {a.views}</span>
                    <span>{dt(a.updatedAt)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3"><p className="muted text-center py-10">{tr("knowledge.notFound")}</p></Card>
        )}
      </div>

      {/* Чтение статьи */}
      {reading && (
        <Modal open onClose={() => setReading(null)} title="" wide>
          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-3xl grid place-items-center text-3xl shrink-0" style={{ background: `color-mix(in srgb, ${CATEGORIES[reading.category]?.color ?? "#8b5cf6"} 16%, transparent)` }}>
              {reading.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">{reading.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge color={CATEGORIES[reading.category]?.color ?? "#8b5cf6"}>{CATEGORIES[reading.category]?.label}</Badge>
                <span className="text-xs muted">Автор: {reading.createdBy} · {dt(reading.updatedAt)}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="btn !px-2.5" onClick={() => { setEditing(reading); setReading(null); }}><Pencil size={14} /></button>
              <button className="btn !px-2.5" onClick={() => remove(reading.id)}><Trash2 size={14} color="var(--error)" /></button>
            </div>
          </div>

          <div className="rounded-3xl p-5 whitespace-pre-line text-sm leading-relaxed max-h-[55vh] overflow-y-auto" style={{ background: "rgba(var(--table-row))" }}>
            {reading.content}
          </div>

          <button className="btn w-full justify-center mt-4" onClick={() => setReading(null)}>Закрыть</button>
        </Modal>
      )}

      {/* Редактор */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? "Редактирование статьи" : "Новая статья"} wide>
          <div className="flex flex-col gap-3.5">
            <input className="input" placeholder="Заголовок статьи" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Категория</label>
                <select className="input" value={editing.category ?? "general"} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Закрепить наверху</label>
                <button className="btn w-full justify-center" style={editing.isPinned ? { background: "linear-gradient(120deg,var(--primary),var(--accent))", color: "#fff", borderColor: "transparent" } : {}}
                  onClick={() => setEditing({ ...editing, isPinned: !editing.isPinned })}>
                  <Pin size={14} /> {editing.isPinned ? "Закреплено" : "Не закреплено"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Иконка</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => setEditing({ ...editing, icon: ic })}
                    className="w-10 h-10 rounded-2xl grid place-items-center text-lg"
                    style={{ background: editing.icon === ic ? "linear-gradient(135deg,var(--primary),var(--accent))" : "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Текст статьи</label>
              <textarea className="input min-h-48 font-mono text-xs" placeholder="Пошаговая инструкция…" value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
            </div>

            <button className="btn btn-primary justify-center" disabled={busy} onClick={save}>
              {busy ? "Сохраняем…" : editing.id ? "Сохранить изменения" : "Опубликовать статью"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
