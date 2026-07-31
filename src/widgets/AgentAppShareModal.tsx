"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  Send,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Layers,
  WifiOff,
} from "lucide-react";
import { Modal, Badge } from "@/shared/ui/kit";
import { useToast } from "@/shared/ui/Toast";

export function AgentAppShareModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [activeOs, setActiveOs] = useState<"android" | "ios">("android");
  const toast = useToast();

  const appUrl = typeof window !== "undefined"
    ? `${window.location.origin}/agent-portal`
    : "https://delis.uz/agent-portal";

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
    appUrl
  )}`;

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    toast("Ссылка на мобильное приложение скопирована!");
    setTimeout(() => setCopied(false), 2500);
  };

  const shareTelegram = () => {
    const text = encodeURIComponent(
      `📲 DELIS Mobile Agent — приложение для торговых агентов:\n${appUrl}\n\nЛогин: agent\nПароль: delis2026`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${text}`, "_blank");
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="📲 Как установить приложение агенту" wide>
      <div className="flex flex-col gap-5">
        {/* Верхняя карточка с объяснением */}
        <div
          className="p-4 rounded-2xl flex items-start gap-3.5"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.15))",
            border: "1px solid rgba(124,58,237,0.3)",
          }}
        >
          <div
            className="w-11 h-11 rounded-2xl grid place-items-center shrink-0 font-bold"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "#fff" }}
          >
            <Smartphone size={20} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm flex items-center gap-2">
              <span>Приложение устанавливается за 15 секунд без App Store и Play Market</span>
              <Badge color="#22c55e">PWA · Офлайн</Badge>
            </div>
            <p className="text-xs muted mt-1 leading-relaxed">
              Агенту достаточно открыть ссылку на телефоне и нажать <b>«На экран Домой»</b>. Появится фирменная иконка DELIS, которая работает во весь экран, без адресной строки и даже без интернета (IndexedDB).
            </p>
          </div>
        </div>

        {/* Сетка: QR-код слева, Ссылка и действия справа */}
        <div className="grid md:grid-cols-2 gap-4 items-center">
          {/* Слева: QR-код */}
          <div
            className="p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3"
            style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-purple-300">
              📸 Наведите камеру телефона
            </div>

            <div className="p-2.5 bg-white rounded-2xl shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="QR-код для установки приложения"
                className="w-44 h-44 rounded-xl block"
              />
            </div>

            <div className="text-[11px] muted">
              Откроется мобильный кабинет агента
            </div>
          </div>

          {/* Справа: Ссылка, логин и шаринг */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] muted uppercase tracking-wider font-semibold block mb-1">
                Прямая ссылка для агента:
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  className="input !text-xs !py-2.5 font-mono truncate"
                  value={appUrl}
                />
                <button
                  onClick={copyLink}
                  className="btn btn-primary !p-2.5 shrink-0"
                  title="Скопировать"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Данные для входа */}
            <div
              className="p-3.5 rounded-2xl flex flex-col gap-1.5 text-xs"
              style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
            >
              <div className="font-bold text-violet-300 flex items-center gap-1.5">
                <Sparkles size={14} /> Данные для входа агента:
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="muted">Логин:</span>
                <b className="font-mono text-sm bg-white/10 px-2 py-0.5 rounded-lg">agent</b>
              </div>
              <div className="flex justify-between items-center">
                <span className="muted">Пароль:</span>
                <b className="font-mono text-sm bg-white/10 px-2 py-0.5 rounded-lg">delis2026</b>
              </div>
            </div>

            {/* Быстрые кнопки отправки */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={shareTelegram}
                className="btn !py-2.5 text-xs font-bold justify-center flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  color: "#fff",
                  borderColor: "transparent",
                }}
              >
                <Send size={14} /> В Telegram
              </button>

              <button
                onClick={() => window.open(appUrl, "_blank")}
                className="btn justify-center text-xs font-bold flex items-center gap-2"
              >
                <ExternalLink size={14} /> Открыть тест
              </button>
            </div>
          </div>
        </div>

        {/* Вкладки с инструкцией для Android и iPhone */}
        <div
          className="p-4 rounded-3xl flex flex-col gap-3"
          style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Пошаговая инструкция для агента:
            </span>

            <div className="flex gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
              <button
                onClick={() => setActiveOs("android")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeOs === "android" ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                🤖 Android (Samsung / Xiaomi)
              </button>
              <button
                onClick={() => setActiveOs("ios")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeOs === "ios" ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                🍏 iPhone (iOS Safari)
              </button>
            </div>
          </div>

          {activeOs === "android" ? (
            <div className="flex flex-col gap-2 text-xs leading-relaxed">
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold grid place-items-center shrink-0">
                  1
                </span>
                <span>Агент открывает ссылку в браузере <b>Chrome</b> на телефоне.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold grid place-items-center shrink-0">
                  2
                </span>
                <span>Нажимает на <b>три точки в правом верхнем углу (⋮)</b>.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold grid place-items-center shrink-0">
                  3
                </span>
                <span>Выбирает пункт <b>«Установить приложение»</b> (или «Добавить на главный экран»).</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-green-500/10 text-green-300 font-semibold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-400" />
                <span>Готово! На рабочем столе телефона появится иконка <b>DELIS Agent</b>, которая работает во весь экран и без интернета.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs leading-relaxed">
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold grid place-items-center shrink-0">
                  1
                </span>
                <span>Агент открывает ссылку в стандартном браузере <b>Safari</b> на iPhone.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold grid place-items-center shrink-0">
                  2
                </span>
                <span>Внизу экрана нажимает кнопку <b>«Поделиться»</b> (квадрат со стрелкой вверх ⎋).</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-bold grid place-items-center shrink-0">
                  3
                </span>
                <span>Прокручивает меню и нажимает <b>«На экран «Домой»»</b> (Add to Home Screen).</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-green-500/10 text-green-300 font-semibold">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-400" />
                <span>Готово! Приложение закрепится на главном экране iPhone как нативное приложение.</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="btn justify-center !py-3 w-full font-bold text-xs"
        >
          Понятно, закрыть
        </button>
      </div>
    </Modal>
  );
}
