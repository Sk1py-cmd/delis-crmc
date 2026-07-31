"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "@/shared/ui/kit";
import { compact, num } from "@/shared/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StatIcon } from "@/shared/ui/StatIcon";

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
  delta?: number;
  color: string;
  icon?: string;
  mode?: "compact" | "num";
}

export function StatCard({ stat, index = 0 }: { stat: Stat; index?: number }) {
  const up = (stat.delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="glass card-pad relative overflow-hidden"
    >
      <div
        className="absolute -top-16 -right-12 w-40 h-40 rounded-full blur-2xl opacity-25"
        style={{ background: stat.color }}
      />
      <div className="flex items-start justify-between gap-3 relative">
        <div className="min-w-0">
          <div className="text-[0.74rem] uppercase tracking-[0.1em] muted font-semibold">{stat.label}</div>
          <div className="text-[1.7rem] font-semibold mt-2 tracking-tight">
            <AnimatedNumber value={stat.value} format={(n) => (stat.mode === "num" ? num(n) : compact(n))} />
            {stat.suffix && <span className="text-base muted ml-1">{stat.suffix}</span>}
          </div>
        </div>
        {stat.icon && <StatIcon emoji={stat.icon} size={20} color={stat.color} />}
      </div>
      {typeof stat.delta === "number" && (
        <div className="flex items-center gap-1.5 mt-3 text-[0.78rem] font-medium" style={{ color: up ? "var(--success)" : "var(--error)" }}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {up ? "+" : ""}
          {stat.delta}% <span className="muted font-normal">за 30 дней</span>
        </div>
      )}
    </motion.div>
  );
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      {stats.map((s, i) => (
        <StatCard key={s.label} stat={s} index={i} />
      ))}
    </div>
  );
}
