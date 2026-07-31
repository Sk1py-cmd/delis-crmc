"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Image as ImageIcon, FileText, Video, Tag, Users, Sparkles, CalendarClock,
  CheckCircle2, Copy, History, Zap, ChevronDown, RefreshCw, FlaskConical,
} from "lucide-react";
import { Card, PageHeader, Badge, Progress, Avatar, Modal } from "@/shared/ui/kit";
import { money, num, SOURCE_LABEL, dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { MediaUploader, MediaPreview, type MediaFile } from "@/shared/ui/MediaUploader";

interface C {
  id: number; name: string; firstName: string; username: string; city: string;
  source: string; isVip: boolean; bonus: number; ordersCount: number;
  totalSpent: number; lastActiveAt: string;
}
interface T { id: number; title: string; body: string; }
interface H {
  id: number; title: string; body: string; recipients: number; channel: string;
  status: string; scheduledAt: string | null; sentAt: string; createdBy: string;
}

const VARIABLES = [
  { key: "{имя}", label: "Имя" },
  { key: "{город}", label: "Город" },
  { key: "{бонусы}", label: "Бонусы" },
  { key: "{username}", label: "Username" },
];

const CHANNELS = [
  { key: "telegram", label: "Telegram Bot" },
  { key: "miniapp", label: "Mini App Push" },
  { key: "all", label: "Все каналы" },
];

export function BroadcastClient({
  operator,
  customers,
  templates,
  history,
}: {
  operator: string;
  customers: C[];
  templates: T[];
  history: H[];
}) {
  const router = useRouter();
  const toast = useToast();

  // Аудитория
  const [city, setCity] = useState("all");
  const [source, setSource] = useState("all");
  const [vip, setVip] = useState(false);
  const [minOrders, setMinOrders] = useState(0);
  const [minSpent, setMinSpent] = useState(0);
  // Сообщение
  const [text, setText] = useState("Здравствуйте, {имя}! 💜 DELIS: новая акция — скидка 20% на всю авто-химию до конца недели. Промокод DELIS20");
  const [attach, setAttach] = useState<string[]>(["Фото"]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [promo, setPromo] = useState({ code: "DELIS20", discount: 20 });
  // Отправка
  const [channel, setChannel] = useState("telegram");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleTime, setScheduleTime] = useState(() => defaultSchedule());
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const cities = Array.from(new Set(customers.map((c) => c.city)));

  const audience = useMemo(
    () =>
      customers.filter(
        (c) =>
          (city === "all" || c.city === city) &&
          (source === "all" || c.source === source) &&
          (!vip || c.isVip) &&
          c.ordersCount >= minOrders &&
          c.totalSpent >= minSpent,
      ),
    [customers, city, source, vip, minOrders, minSpent],
  );

  const previewCustomer = audience.find((c) => c.id === previewId) ?? audience[0] ?? customers[0];

  const personalize = (body: string, c?: C) => {
    if (!c) return body;
    return body
      .replaceAll("{имя}", c.firstName)
      .replaceAll("{город}", c.city)
      .replaceAll("{бонусы}", num(c.bonus))
      .replaceAll("{username}", c.username ? "@" + c.username : "");
  };

  const breakdown = useMemo(() => {
    const bySource: Record<string, number> = {};
    audience.forEach((c) => (bySource[c.source] = (bySource[c.source] ?? 0) + 1));
    return Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  }, [audience]);

  const resetFilters = () => {
    setCity("all"); setSource("all"); setVip(false); setMinOrders(0); setMinSpent(0);
  };

  const PRESETS = [
    { key: "all", label: "Все клиенты", apply: () => resetFilters() },
    { key: "vip", label: "⭐ Только VIP", apply: () => { resetFilters(); setVip(true); } },
    { key: "tashkent", label: "📍 Ташкент", apply: () => { resetFilters(); setCity("Tashkent"); } },
    { key: "miniapp", label: "📱 Из Mini App", apply: () => { resetFilters(); setSource("miniapp"); } },
    { key: "big", label: "💎 Крупные покупатели", apply: () => { resetFilters(); setMinSpent(1000000); } },
  ];

  const insertVariable = (key: string) => setText((t) => t + " " + key);
  const insertPromo = () => setText((t) => `${t} Промокод ${promo.code} (−${promo.discount}%)`.trim());
  const genPromo = () => {
    const code = "DELIS" + Math.floor(Math.random() * 90 + 10);
    const discount = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
    setPromo({ code, discount });
    toast(`Сгенерирован промокод ${code} на −${discount}%`);
  };

  const applyTemplate = (t: T) => {
    setText(t.body);
    setTemplateOpen(false);
    toast(`Шаблон «${t.title}» применён`);
  };

  const displayBroadcastBody = (body: string) => {
    if (!body?.startsWith("{")) return body;
    try {
      const parsed = JSON.parse(body) as { text?: string; media?: unknown[]; attachments?: string[] };
      const suffix = parsed.media?.length ? ` · ${parsed.media.length} файла` : "";
      return `${parsed.text ?? body}${suffix}`;
    } catch {
      return body;
    }
  };

  const saveTemplate = async () => {
    try {
      await postManage("saveTemplate", { title: text.slice(0, 48) || "Шаблон рассылки", body: text });
      toast("Шаблон сохранён в библиотеку");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
  };

  const send = async () => {
    if (audience.length === 0) {
      toast("Аудитория пуста — измените фильтры", "err");
      return;
    }
    if (sendMode === "schedule" && !scheduleTime) {
      toast("Укажите дату и время отправки", "err");
      return;
    }
    setSending(true); setDone(false); setProgress(0);
    const status = sendMode === "schedule" ? "scheduled" : "sent";
    try {
      await postManage("sendBroadcast", {
        title: text.slice(0, 60),
        body: text,
        recipients: audience.length,
        channel,
        status,
        scheduledAt: sendMode === "schedule" ? scheduleTime : null,
        attachments: [...attach, ...mediaFiles.map((m) => `${m.kind}:${m.name}`)],
        media: mediaFiles,
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка отправки", "err");
      setSending(false);
      return;
    }
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(iv);
          setSending(false); setDone(true);
          toast(
            sendMode === "schedule"
              ? `Рассылка запланирована на ${dt(scheduleTime)}`
              : `Рассылка отправлена ${audience.length} клиентам`,
          );
          router.refresh();
          return 100;
        }
        return p + 4;
      });
    }, 50);
  };

  const toggle = (a: string) => setAttach((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  return (
    <>
      <PageHeader
        title="Массовые рассылки"
        subtitle="Персональные кампании в Telegram Bot, Mini App и Push — с шаблонами, сегментацией и расписанием"
        actions={
          <>
            <Badge color="var(--primary)"><Users size={12} /> Получат: {num(audience.length)}</Badge>
            <Badge color="#22c55e"><CheckCircle2 size={12} /> Оператор: {operator}</Badge>
          </>
        }
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-[300px_1fr_320px]">
        {/* ===== КОЛОНКА 1: АУДИТОРИЯ ===== */}
        <Card hover={false} className="self-start">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Users size={16} /> Аудитория</h3>
          <p className="muted text-xs mb-3">Выберите, кому отправить</p>

          <div className="flex flex-col gap-1.5 mb-4">
            {PRESETS.map((p) => (
              <button key={p.key} onClick={p.apply} className="btn w-full justify-start !py-2 text-[0.82rem]">
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-px my-3" style={{ background: "rgba(var(--border))" }} />

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs muted">Город</label>
              <select className="input mt-1 !py-2" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="all">Все города</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs muted">Источник</label>
              <select className="input mt-1 !py-2" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="all">Все источники</option>
                {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <button
              onClick={() => setVip((v) => !v)}
              className="btn justify-between !py-2"
              style={vip ? { background: "linear-gradient(120deg,#f59e0b,#f97316)", color: "#fff", borderColor: "transparent" } : {}}
            >
              Только VIP <span>{vip ? "✓" : "—"}</span>
            </button>
            <div>
              <label className="text-xs muted">Мин. заказов: <b>{minOrders}</b></label>
              <input type="range" min={0} max={10} value={minOrders} onChange={(e) => setMinOrders(Number(e.target.value))} className="w-full mt-1 accent-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs muted">Сумма покупок от: <b>{money(minSpent)}</b></label>
              <input type="range" min={0} max={5000000} step={100000} value={minSpent} onChange={(e) => setMinSpent(Number(e.target.value))} className="w-full mt-1 accent-[var(--primary)]" />
            </div>
          </div>

          <div className="h-px my-3" style={{ background: "rgba(var(--border))" }} />

          <div className="rounded-2xl p-3 text-center" style={{ background: "rgba(var(--table-row))" }}>
            <div className="text-3xl font-semibold grad-text">{num(audience.length)}</div>
            <div className="text-xs muted mt-0.5">получателей</div>
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {breakdown.map(([src, cnt]) => (
              <div key={src} className="flex items-center justify-between text-xs">
                <span className="muted">{SOURCE_LABEL[src] ?? src}</span>
                <span className="font-semibold">{cnt}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ===== КОЛОНКА 2: СООБЩЕНИЕ ===== */}
        <Card hover={false}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles size={16} /> Сообщение</h3>
            <div className="relative">
              <button className="btn !py-1.5" onClick={() => setTemplateOpen((v) => !v)}>
                Шаблоны <ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {templateOpen && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass absolute right-0 mt-2 w-64 z-40 p-1.5">
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => applyTemplate(t)} className="w-full text-left px-3 py-2 rounded-xl hover:bg-[rgba(var(--table-row))]">
                        <div className="text-[0.8rem] font-medium truncate">{t.title}</div>
                        <div className="text-xs muted truncate">{t.body}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="muted text-xs mb-3">Используйте переменные для персонализации каждого сообщения</p>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {VARIABLES.map((v) => (
              <button key={v.key} className="chip" style={{ color: "var(--primary)", borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)" }} onClick={() => insertVariable(v.key)}>
                <Sparkles size={11} /> {v.label}
              </button>
            ))}
          </div>

          <textarea className="input min-h-40 text-[0.9rem] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {[
              { k: "Фото", i: ImageIcon },
              { k: "Видео", i: Video },
              { k: "PDF", i: FileText },
            ].map(({ k, i: Icon }) => (
              <button key={k} onClick={() => toggle(k)} className="chip"
                style={{
                  color: attach.includes(k) ? "#fff" : "var(--muted)",
                  background: attach.includes(k) ? "linear-gradient(120deg,var(--primary),var(--accent))" : "transparent",
                }}>
                <Icon size={12} /> {k}
              </button>
            ))}
            <div className="flex-1" />
            <button className="btn !py-1.5" onClick={genPromo}><FlaskConical size={14} /> Промокод</button>
            <button className="btn !py-1.5" onClick={insertPromo}><Tag size={14} /> Вставить {promo.code}</button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs muted uppercase tracking-wider">Медиа для рассылки</label>
              <span className="text-xs muted">Фото · Видео · PDF</span>
            </div>
            <MediaUploader files={mediaFiles} onChange={setMediaFiles} max={6} />
          </div>

          <div className="flex gap-2 mt-3">
            <button className="btn flex-1 justify-center" onClick={saveTemplate}><Copy size={14} /> Сохранить как шаблон</button>
          </div>
        </Card>

        {/* ===== КОЛОНКА 3: ПРЕДПРОСМОТР И ОТПРАВКА ===== */}
        <div className="flex flex-col gap-[var(--gap)]">
          <Card hover={false}>
            <h3 className="font-semibold mb-1 flex items-center gap-2"><Zap size={16} /> Предпросмотр</h3>
            <p className="muted text-xs mb-2">Так увидит сообщение клиент</p>
            <select className="input !py-2 mb-3" value={previewId ?? ""} onChange={(e) => setPreviewId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Случайный получатель</option>
              {audience.slice(0, 30).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
            </select>
            <div className="rounded-3xl p-3" style={{ background: "rgba(var(--table-row))" }}>
              {previewCustomer && (
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={previewCustomer.name} color="var(--primary)" size={28} />
                  <div className="text-xs">
                    <div className="font-medium">{previewCustomer.name}</div>
                    <div className="muted">@{previewCustomer.username} · DELIS Bot</div>
                  </div>
                </div>
              )}
              <div className="px-3.5 py-2.5 text-[0.85rem] leading-relaxed" style={{ background: "linear-gradient(120deg,var(--primary),var(--accent))", color: "#fff", borderRadius: "18px 18px 18px 4px" }}>
                {personalize(text, previewCustomer)}
                {(attach.length > 0 || mediaFiles.length > 0) && (
                  <div className="text-xs opacity-80 mt-1.5">📎 {[...attach, ...mediaFiles.map((m) => m.name)].join(" · ")}</div>
                )}
              </div>
              {mediaFiles.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {mediaFiles.slice(0, 3).map((m, i) => (
                    <MediaPreview key={i} file={m} />
                  ))}
                  {mediaFiles.length > 3 && <div className="text-xs muted">+ ещё {mediaFiles.length - 3} файла</div>}
                </div>
              )}
            </div>
          </Card>

          <Card hover={false}>
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Send size={16} /> Отправка</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs muted">Канал</label>
                <select className="input mt-1 !py-2" value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn justify-center !py-2" onClick={() => setSendMode("now")}
                  style={sendMode === "now" ? { background: "linear-gradient(120deg,var(--primary),var(--accent))", color: "#fff", borderColor: "transparent" } : {}}>
                  <Zap size={14} /> Сейчас
                </button>
                <button className="btn justify-center !py-2" onClick={() => setSendMode("schedule")}
                  style={sendMode === "schedule" ? { background: "linear-gradient(120deg,var(--primary),var(--accent))", color: "#fff", borderColor: "transparent" } : {}}>
                  <CalendarClock size={14} /> Отложить
                </button>
              </div>
              {sendMode === "schedule" && (
                <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} type="datetime-local" className="input !py-2" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              )}

              <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary justify-center !py-3" disabled={sending || audience.length === 0} onClick={send}>
                {sending ? <RefreshCw size={16} className="animate-spin" /> : sendMode === "schedule" ? <CalendarClock size={16} /> : <Send size={16} />}
                {sending ? "Отправляем…" : sendMode === "schedule" ? "Запланировать" : `Отправить ${num(audience.length)} клиентам`}
              </motion.button>

              <AnimatePresence>
                {(sending || done) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Progress value={progress} color={done ? "#22c55e" : "var(--primary)"} />
                    <div className="text-xs muted mt-2">
                      {done ? "✅ Готово" : `Обработано ${Math.round((progress / 100) * audience.length)} из ${num(audience.length)}`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </div>

      {/* ===== ИСТОРИЯ ===== */}
      <Card hover={false} className="!p-0">
        <div className="card-pad pb-2 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><History size={16} /> История рассылок</h3>
          <span className="muted text-xs">{history.length} кампаний</span>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Кампания</th>
                <th>Канал</th>
                <th>Получатели</th>
                <th className="hidden md:table-cell">Автор</th>
                <th>Статус</th>
                <th className="hidden lg:table-cell">Отправлена</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>
                    <div className="text-[0.85rem] font-medium truncate max-w-[240px]">{h.title}</div>
                    <div className="text-xs muted truncate max-w-[240px]">{displayBroadcastBody(h.body)}</div>
                  </td>
                  <td className="muted">{CHANNELS.find((c) => c.key === h.channel)?.label ?? h.channel}</td>
                  <td className="font-semibold">{num(h.recipients)}</td>
                  <td className="muted hidden md:table-cell">{h.createdBy}</td>
                  <td>
                    {h.status === "sent" ? <Badge color="#22c55e">Отправлена</Badge> : <Badge color="#f97316">Запланирована</Badge>}
                  </td>
                  <td className="muted hidden lg:table-cell whitespace-nowrap">{dt(h.status === "scheduled" && h.scheduledAt ? h.scheduledAt : h.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function defaultSchedule() {
  const d = new Date(Date.now() + 3600e3);
  d.setMinutes(0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
