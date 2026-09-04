"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Plus, AlertTriangle, TrendingUp, Package, MessageSquare, Users } from "lucide-react";
import { Card } from "@/shared/ui/kit";

interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "mid" | "low";
  icon: string;
}

const PRIORITY_STYLE = {
  high: { color: "#ef4444", bg: "color-mix(in srgb, #ef4444 14%, transparent)", label: "Срочно" },
  mid: { color: "#f97316", bg: "color-mix(in srgb, #f97316 14%, transparent)", label: "Важно" },
  low: { color: "#22c55e", bg: "color-mix(in srgb, #22c55e 14%, transparent)", label: "Можно позже" },
};

export function TasksToday() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState("");

  const toggle = (id: string) =>
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const add = () => {
    if (!newText.trim()) return;
    setTasks((t) => [
      ...t,
      { id: Date.now().toString(), text: newText.trim(), done: false, priority: "mid", icon: "✅" },
    ]);
    setNewText("");
  };

  const done = tasks.filter((t) => t.done).length;
  const pct = Math.round((done / Math.max(tasks.length, 1)) * 100);

  return (
    <Card hover={false}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Задачи на сегодня</h3>
          <p className="muted text-xs mt-0.5">{done} из {tasks.length} выполнено · {pct}%</p>
        </div>
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(var(--border))" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15" fill="none"
              stroke="var(--primary)" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 15}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 15 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 15 * (1 - pct / 100) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-[0.65rem] font-bold">{pct}%</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {tasks.length === 0 && (
          <p className="muted text-xs text-center py-6">Нет задач на сегодня</p>
        )}
        <AnimatePresence>
          {tasks.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).map((t) => {
            const pStyle = PRIORITY_STYLE[t.priority];
            return (
              <motion.button
                key={t.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => toggle(t.id)}
                className="flex items-center gap-3 rounded-2xl p-2.5 text-left w-full group"
                style={{ background: t.done ? "transparent" : "rgba(var(--table-row))" }}
              >
                {t.done
                  ? <CheckCircle2 size={18} color="var(--success)" className="shrink-0" />
                  : <Circle size={18} className="shrink-0 muted group-hover:text-[var(--primary)]" />
                }
                <span className="flex-1 text-[0.82rem]" style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1 }}>
                  {t.icon} {t.text}
                </span>
                {!t.done && (
                  <span className="chip text-[0.65rem] shrink-0" style={{ color: pStyle.color, background: pStyle.bg, borderColor: "transparent" }}>
                    {pStyle.label}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="input flex-1"
          placeholder="Добавить задачу…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <motion.button whileTap={{ scale: 0.95 }} className="btn btn-primary !px-3" onClick={add}>
          <Plus size={16} />
        </motion.button>
      </div>
    </Card>
  );
}
