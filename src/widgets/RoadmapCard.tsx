"use client";

import { Card } from "@/shared/ui/kit";
import { useT } from "@/shared/i18n/useT";

/**
 * Карточка «Что уже реализовано» на дашборде. Вынесена в клиентский
 * компонент, чтобы текст шёл через useT() и переводился на ru/uz/en,
 * а не зависел от подстановки AutoTranslator по дереву DOM.
 */

const FEATURES = [
  { icon: "🤖", titleKey: "dash.featureTelegram", descKey: "dash.featureTelegramDesc", color: "#0ea5e9" },
  { icon: "📊", titleKey: "dash.featureExcel", descKey: "dash.featureExcelDesc", color: "#22c55e" },
  { icon: "🔔", titleKey: "dash.featureLive", descKey: "dash.featureLiveDesc", color: "#f97316" },
  { icon: "🗺️", titleKey: "dash.featureGps", descKey: "dash.featureGpsDesc", color: "#8b5cf6" },
  { icon: "📱", titleKey: "dash.featurePwa", descKey: "dash.featurePwaDesc", color: "#3b82f6" },
  { icon: "🔐", titleKey: "dash.feature2fa", descKey: "dash.feature2faDesc", color: "#ec4899" },
];

export function RoadmapCard() {
  const t = useT();

  return (
    <Card hover={false}>
      <h3 className="font-semibold mb-3">✅ {t("dash.roadmapTitle")}</h3>
      <div className="flex flex-col gap-2">
        {FEATURES.map((r) => (
          <div key={r.titleKey} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(var(--table-row))" }}>
            <span className="text-xl shrink-0">{r.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[0.83rem] font-semibold" style={{ color: r.color }}>{t(r.titleKey)}</div>
              <div className="text-xs muted truncate">{t(r.descKey)}</div>
            </div>
            <span className="text-[0.7rem] font-semibold shrink-0" style={{ color: "var(--success)" }}>{t("dash.roadmapDone")}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
