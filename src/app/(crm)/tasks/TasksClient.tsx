"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Calendar, Flag, User, Link2, CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, PageHeader, Badge, Modal, Avatar } from "@/shared/ui/kit";
import { dt } from "@/shared/lib/format";
import { useNow } from "@/shared/lib/useNow";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { useT } from "@/shared/i18n/useT";

interface TaskLite {
  id: number; title: string; description: string; assignee: string;
  priority: string; status: string; linkType: string; linkLabel: string;
  dueAt: string | null; createdBy: string; createdAt: string;
}

const COLUMNS = [
  { key: "todo", labelKey: "tasks.todo", color: "#6b7280", icon: Circle },
  { key: "in_progress", labelKey: "tasks.inProgress", color: "#f97316", icon: Clock },
  { key: "done", labelKey: "tasks.done", color: "#22c55e", icon: CheckCircle2 },
];

const PRIORITY: Record<string, { label: string; color: string }> = {
  high: { label: "Срочно", color: "#ef4444" },
  mid: { label: "Обычная", color: "#f97316" },
  low: { label: "Не срочно", color: "#22c55e" },
};

const LINK_ICON: Record<string, string> = {
  order: "🧾", customer: "👤", agent: "🧑‍💼", supplier: "🏭",
};

export function TasksClient({ tasks, team }: { tasks: TaskLite[]; team: string[] }) {
  const [modal, setModal] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", assignee: team[0] ?? "", priority: "mid",
    linkType: "", linkLabel: "", dueAt: "",
  });
  const toast = useToast();
  const tr = useT();
  const router = useRouter();
  const now = useNow();

  const move = async (id: number, status: string) => {
    setDragId(null);
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    try {
      await postManage("updateTaskStatus", { id, status });
      if (status === "done") toast("Задача выполнена ✅");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
  };

  const create = async () => {
    if (!form.title.trim()) { toast("Укажите название задачи", "err"); return; }
    setBusy(true);
    try {
      await postManage("createTask", form);
      toast("Задача создана и назначена исполнителю");
      setModal(false);
      setForm({ title: "", description: "", assignee: team[0] ?? "", priority: "mid", linkType: "", linkLabel: "", dueAt: "" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const remove = async (id: number) => {
    try {
      await postManage("deleteTask", { id });
      toast("Задача удалена");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
  };

  const isOverdue = (t: TaskLite) => t.status !== "done" && !!t.dueAt && new Date(t.dueAt).getTime() < now;
  const overdue = now === 0 ? 0 : tasks.filter(isOverdue).length;

  return (
    <>
      <PageHeader
        title={tr("tasks.title")}
        subtitle={tr("tasks.subtitle")}
        actions={<button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> {tr("tasks.newTask")}</button>}
      />

      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-4">
        {[
          { label: tr("tasks.total"), value: String(tasks.length), color: "#8b5cf6", icon: "📋" },
          { label: tr("tasks.inProgress"), value: String(tasks.filter((t) => t.status === "in_progress").length), color: "#f97316", icon: "⚡" },
          { label: tr("tasks.done"), value: String(tasks.filter((t) => t.status === "done").length), color: "#22c55e", icon: "✅" },
          { label: tr("tasks.overdue"), value: String(overdue), color: "#ef4444", icon: "🔥" },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: s.color }}>{s.icon} {s.value}</div>
          </Card>
        ))}
      </div>

      {/* Kanban */}
      <div className="grid gap-[var(--gap)] md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          const Icon = col.icon;
          return (
            <div
              key={col.key}
              className="flex flex-col gap-3 rounded-3xl p-3 min-h-[50vh] transition-colors"
              style={{ background: "rgba(var(--surface),0.3)", border: "1px dashed rgba(var(--border))" }}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.background = "rgba(var(--surface),0.7)"; }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(var(--surface),0.3)"; }}
              onDrop={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.background = "rgba(var(--surface),0.3)"; if (dragId) move(dragId, col.key); }}
            >
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2">
                  <Icon size={16} color={col.color} />
                  <span className="font-semibold text-sm">{tr(col.labelKey)}</span>
                </div>
                <Badge color={col.color}>{items.length}</Badge>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                  {items.map((t) => {
                    const pr = PRIORITY[t.priority] ?? PRIORITY.mid;
                    const late = isOverdue(t);
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => setDragId(null)}
                        className="glass card-pad !p-3.5 cursor-grab active:cursor-grabbing group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm leading-snug" style={{ textDecoration: t.status === "done" ? "line-through" : "none", opacity: t.status === "done" ? 0.6 : 1 }}>
                            {t.title}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => remove(t.id)}>
                            <Trash2 size={13} color="var(--error)" />
                          </button>
                        </div>

                        {t.description && <p className="text-xs muted mt-1.5 line-clamp-2">{t.description}</p>}

                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          <Badge color={pr.color}><Flag size={10} /> {pr.label}</Badge>
                          {t.linkLabel && (
                            <span className="chip !text-[0.68rem]" style={{ borderColor: "rgba(var(--border))" }}>
                              {LINK_ICON[t.linkType] ?? "🔗"} {t.linkLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(var(--border))" }}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {t.assignee && <Avatar name={t.assignee} size={20} color={col.color} />}
                            <span className="text-xs muted truncate">{t.assignee || tr("tasks.notAssigned")}</span>
                          </div>
                          {t.dueAt && (
                            <span className="text-[0.68rem] flex items-center gap-1" style={{ color: late ? "var(--error)" : "var(--muted)" }}>
                              <Calendar size={10} /> {dt(t.dueAt)}
                            </span>
                          )}
                        </div>

                        {t.status !== "done" && (
                          <div className="flex gap-1.5 mt-2.5">
                            {t.status === "todo" && (
                              <button className="btn !py-1 !px-2.5 !text-xs flex-1 justify-center" onClick={() => move(t.id, "in_progress")}>
                                {tr("tasks.toWork")}
                              </button>
                            )}
                            <button className="btn btn-primary !py-1 !px-2.5 !text-xs flex-1 justify-center" onClick={() => move(t.id, "done")}>
                              {tr("tasks.markDone")}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {items.length === 0 && (
                  <div className="text-center py-8 text-xs muted border-2 border-dashed rounded-2xl" style={{ borderColor: "rgba(var(--border))" }}>
                    {tr("tasks.dragHere")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal open onClose={() => setModal(false)} title="Новая задача" wide>
          <div className="grid md:grid-cols-2 gap-3.5">
            <input className="input md:col-span-2" placeholder={tr("tasks.taskName")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="input md:col-span-2 min-h-20" placeholder={tr("tasks.taskDesc")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div>
              <label className="text-xs muted uppercase tracking-wider">{tr("tasks.assignee")}</label>
              <select className="input mt-1.5" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                {team.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs muted uppercase tracking-wider">{tr("tasks.priority")}</label>
              <select className="input mt-1.5" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="high">🔴 Срочно</option>
                <option value="mid">🟠 Обычная</option>
                <option value="low">🟢 Не срочно</option>
              </select>
            </div>
            <div>
              <label className="text-xs muted uppercase tracking-wider">{tr("tasks.link")}</label>
              <select className="input mt-1.5" value={form.linkType} onChange={(e) => setForm({ ...form, linkType: e.target.value })}>
                <option value="">Без привязки</option>
                <option value="order">🧾 Заказ</option>
                <option value="customer">👤 Клиент</option>
                <option value="agent">🧑‍💼 Агент</option>
                <option value="supplier">🏭 Поставщик</option>
              </select>
            </div>
            <input className="input" placeholder="Метка привязки (напр. DLS-24031)" value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} />
            <div className="md:col-span-2">
              <label className="text-xs muted uppercase tracking-wider">{tr("tasks.deadline")}</label>
              <input type="datetime-local" className="input mt-1.5" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary w-full justify-center mt-4" disabled={busy} onClick={create}>
            {busy ? tr("common.saving") : tr("tasks.newTask")}
          </button>
        </Modal>
      )}
    </>
  );
}
