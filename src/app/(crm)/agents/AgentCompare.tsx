"use client";

import { useMemo } from "react";
import { Card, Badge, Avatar, Progress } from "@/shared/ui/kit";
import { money, compact } from "@/shared/lib/format";

interface AgentLite {
  id: number;
  name: string;
  phone: string;
  telegram: string;
  email: string;
  region: string;
  route: string;
  plan: string;
  fact: string;
  commission: number;
  visits: number;
  avatarColor: string;
}

const METRICS = [
  { key: "plan", label: "План продаж", format: (v: number) => compact(v) },
  { key: "fact", label: "Факт продаж", format: (v: number) => compact(v) },
  { key: "pct", label: "Выполнение", format: (v: number) => `${v.toFixed(1)}%` },
  { key: "visits", label: "Количество визитов", format: (v: number) => String(v) },
  { key: "commission", label: "Комиссия", format: (v: number) => `${v}%` },
  { key: "payout", label: "К выплате", format: (v: number) => money(v) },
  { key: "avgCheck", label: "Средний чек на визит", format: (v: number) => money(v) },
];

export function AgentCompare({ agents }: { agents: AgentLite[] }) {
  const rows = useMemo(
    () =>
      agents.map((a) => {
        const plan = Number(a.plan);
        const fact = Number(a.fact);
        const pct = (fact / Math.max(plan, 1)) * 100;
        return {
          ...a,
          pct,
          payout: (fact * a.commission) / 100,
          avgCheck: fact / Math.max(a.visits, 1),
        };
      }),
    [agents],
  );

  const best = (metric: keyof typeof rows[0]) => Math.max(...rows.map((r) => Number(r[metric])));
  const worst = (metric: keyof typeof rows[0]) => Math.min(...rows.map((r) => Number(r[metric])));

  return (
    <div className="flex flex-col gap-4">
      <Card hover={false}>
        <h3 className="font-semibold mb-1">Сравнительная таблица агентов</h3>
        <p className="muted text-xs mb-4">Лучший показатель подсвечен зелёным, отстающий — красным. Агенты мотивируются видеть общий рейтинг.</p>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Агент</th>
                {METRICS.map((m) => (
                  <th key={m.key}>{m.label}</th>
                ))}
                <th>Рейтинг</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => b.pct - a.pct)
                .map((a, idx) => {
                  const totalScore = METRICS.reduce((acc, m) => {
                    const v = Number(a[m.key as keyof typeof a]);
                    const b = best(m.key as keyof typeof rows[0]);
                    return acc + (v / Math.max(b, 1)) * 100;
                  }, 0) / METRICS.length;

                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-2.5 h-[var(--row)]">
                          <span className="text-xs font-bold muted w-5">#{idx + 1}</span>
                          <Avatar name={a.name} color={a.avatarColor} size={32} />
                          <div className="min-w-0">
                            <div className="text-[0.85rem] font-medium truncate max-w-[140px]">{a.name}</div>
                            <div className="text-xs muted">{a.region}</div>
                          </div>
                        </div>
                      </td>
                      {METRICS.map((m) => {
                        const v = Number(a[m.key as keyof typeof a]);
                        const bVal = best(m.key as keyof typeof rows[0]);
                        const wVal = worst(m.key as keyof typeof rows[0]);
                        const isBest = v === bVal && bVal !== wVal;
                        const isWorst = v === wVal && bVal !== wVal;
                        return (
                          <td key={m.key} style={{ color: isBest ? "var(--success)" : isWorst ? "var(--error)" : undefined, fontWeight: isBest ? 700 : 400 }}>
                            {m.format(v)}
                            {isBest && <span className="ml-1 text-[0.7rem]">🏆</span>}
                          </td>
                        );
                      })}
                      <td>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1">
                            <Progress value={totalScore} color={totalScore >= 80 ? "#22c55e" : totalScore >= 50 ? "#f97316" : "#ef4444"} />
                          </div>
                          <span className="text-xs font-bold">{totalScore.toFixed(0)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Визуальное сравнение двух лидеров */}
      <div className="grid gap-[var(--gap)] md:grid-cols-2">
        {rows
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 2)
          .map((a, i) => (
            <Card key={a.id}>
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={a.name} color={a.avatarColor} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs muted">{a.region} · {a.route}</div>
                </div>
                <Badge color={i === 0 ? "#22c55e" : "#f97316"}>
                  {i === 0 ? "🏆 Лидер" : "🥈 Второе место"}
                </Badge>
              </div>

              {METRICS.slice(0, 5).map((m) => {
                const v = Number(a[m.key as keyof typeof a]);
                const bVal = best(m.key as keyof typeof rows[0]);
                return (
                  <div key={m.key} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="muted">{m.label}</span>
                      <span className="font-semibold">{m.format(v)}</span>
                    </div>
                    <Progress value={(v / Math.max(bVal, 1)) * 100} color={i === 0 ? "#22c55e" : "#f97316"} />
                  </div>
                );
              })}
            </Card>
          ))}
      </div>
    </div>
  );
}
