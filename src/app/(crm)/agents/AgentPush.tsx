"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, TrendingUp, Target, CheckCircle2 } from "lucide-react";
import { useToast } from "@/shared/ui/Toast";

interface AgentLite {
  id: number;
  name: string;
  plan: string;
  fact: string;
  avatarColor: string;
}

interface PushNotif {
  id: string;
  agentName: string;
  message: string;
  color: string;
  type: "near_plan" | "plan_done" | "over_plan";
}

export function AgentPush({ agents }: { agents: AgentLite[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const toast = useToast();

  // Производные данные считаем через useMemo, а не через useEffect + setState:
  // это исключает лишний ререндер и каскадные обновления.
  const notifs = useMemo<PushNotif[]>(() => {
    const alerts: PushNotif[] = [];
    agents.forEach((a) => {
      const pct = (Number(a.fact) / Math.max(Number(a.plan), 1)) * 100;
      // Порядок важен: сначала самый высокий порог, иначе ветка 110% недостижима.
      if (pct >= 110) {
        alerts.push({
          id: `over-plan-${a.id}`,
          agentName: a.name,
          message: `Перевыполнение плана на ${(pct - 100).toFixed(0)}%! Супер-результат 🏆`,
          color: "#8b5cf6",
          type: "over_plan",
        });
      } else if (pct >= 100) {
        alerts.push({
          id: `plan-done-${a.id}`,
          agentName: a.name,
          message: `План выполнен на ${pct.toFixed(0)}%! Начисляется премия 🎉`,
          color: "#22c55e",
          type: "plan_done",
        });
      } else if (pct >= 85) {
        alerts.push({
          id: `near-plan-${a.id}`,
          agentName: a.name,
          message: `До плана осталось ${(100 - pct).toFixed(0)}% — агент почти выполнил!`,
          color: "#f97316",
          type: "near_plan",
        });
      }
    });
    return alerts;
  }, [agents]);

  const visible = notifs.filter((n) => !dismissed.has(n.id));

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {visible.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="glass card-pad !py-3 flex items-start gap-3 pointer-events-auto"
            style={{ borderLeft: `3px solid ${n.color}`, borderColor: `color-mix(in srgb, ${n.color} 45%, transparent)` }}
          >
            <div className="w-8 h-8 rounded-xl grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${n.color} 18%, transparent)`, color: n.color }}>
              {n.type === "plan_done" ? <CheckCircle2 size={15} /> : n.type === "near_plan" ? <Target size={15} /> : <TrendingUp size={15} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">{n.agentName}</div>
              <div className="text-xs muted mt-0.5">{n.message}</div>
            </div>
            <button className="muted hover:text-white transition-colors shrink-0" onClick={() => setDismissed((s) => new Set([...s, n.id]))}>
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
