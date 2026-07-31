"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compact } from "@/shared/lib/format";

const axis = { stroke: "rgba(150,150,180,0.5)", fontSize: 11 };

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
}

function Tip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass" style={{ padding: 12, borderRadius: 14, fontSize: 12 }}>
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {compact(Number(p.value ?? 0))}
        </div>
      ))}
    </div>
  );
}

export function RevenueArea({ data }: { data: { day: string; revenue: number; profit: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.65} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke="rgba(150,150,180,0.14)" vertical={false} />
        <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} minTickGap={22} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v: number) => compact(v)} width={54} />
        <Tooltip content={<Tip />} />
        <Area type="monotone" dataKey="revenue" name="Выручка" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gRev)" animationDuration={1200} />
        <Area type="monotone" dataKey="profit" name="Прибыль" stroke="var(--accent)" strokeWidth={2.5} fill="url(#gPro)" animationDuration={1500} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, color = "var(--primary)", height = 240 }: { data: { name: string; value: number }[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="4 6" stroke="rgba(150,150,180,0.14)" vertical={false} />
        <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v: number) => compact(v)} width={54} />
        <Tooltip content={<Tip />} cursor={{ fill: "rgba(150,150,180,0.08)" }} />
        <Bar dataKey="value" name="Значение" fill={color} radius={[10, 10, 4, 4]} animationDuration={1100} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f97316", "#ec4899", "#14b8a6", "#eab308", "#ef4444"];

export function Donut({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={3} animationDuration={1100} stroke="none">
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<Tip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Lines({ data, keys, height = 260 }: { data: Record<string, string | number>[]; keys: { key: string; name: string; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 6" stroke="rgba(150,150,180,0.14)" vertical={false} />
        <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} minTickGap={20} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v: number) => compact(v)} width={54} />
        <Tooltip content={<Tip />} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={2.5} dot={false} animationDuration={1200} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Legend({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-2 text-[0.8rem]">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
          <span className="flex-1 capitalize truncate">{d.name}</span>
          <span className="muted">{Math.round((d.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
