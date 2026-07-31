"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Send, Paperclip, FileText, Image as ImageIcon, Film, Zap, Check, CheckCheck, Mic, ArrowLeft } from "lucide-react";
import { Card, Badge, Avatar } from "@/shared/ui/kit";
import { dt, timeOnly, SOURCE_LABEL } from "@/shared/lib/format";
import { MediaPreview, type MediaFile } from "@/shared/ui/MediaUploader";
import { useT } from "@/shared/i18n/useT";

export interface Thread {
  id: number;
  name: string;
  username: string;
  city: string;
  isVip: boolean;
  source: string;
  last: string | null;
  lastAt: string | null;
  unread: string;
}

export interface Msg {
  id: number;
  customerId: number;
  body: string;
  fromAdmin: boolean;
  kind: string;
  createdAt: string;
}

export function ChatClient({ threads, initialId }: { threads: Thread[]; initialId?: number }) {
  const [active, setActive] = useState<number>(initialId ?? threads[0]?.id ?? 0);
  const tr = useT();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [typing, setTyping] = useState(false);
  const [attachments, setAttachments] = useState<MediaFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobile, setMobile] = useState<"list" | "chat">("list");
  const endRef = useRef<HTMLDivElement>(null);

  const templates = [
    "Заказ принят ✅",
    "Заказ собирается на складе 📦",
    "Передан курьеру 🚚",
    "Доставлен 🎉 Спасибо за покупку!",
    "Дарим персональную скидку 15% 💜",
  ];

  const load = async (id: number) => {
    setLoading(true);
    const res = await fetch(`/api/messages?customerId=${id}`);
    const data = (await res.json()) as { messages: Msg[] };
    setMsgs(data.messages);
    setLoading(false);
  };

  useEffect(() => {
    if (active) void load(active);
  }, [active]);

  useEffect(() => {
    const t = setInterval(() => {
      if (active) void fetch(`/api/messages?customerId=${active}`).then(async (r) => {
        const d = (await r.json()) as { messages: Msg[] };
        setMsgs((prev) => (d.messages.length !== prev.length ? d.messages : prev));
      });
    }, 6000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const uploadFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploadingFile(true);
    const added: MediaFile[] = [];
    for (const file of Array.from(list)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = (await res.json()) as { ok?: boolean; url?: string; kind?: string; name?: string; size?: number; error?: string };
        if (d.ok && d.url) {
          added.push({ url: d.url, kind: (d.kind as MediaFile["kind"]) ?? "image", name: d.name ?? file.name, size: d.size ?? file.size });
        }
      } catch {
        /* ignore */
      }
    }
    setAttachments((a) => [...a, ...added]);
    setUploadingFile(false);
  };

  const send = async (body: string) => {
    if ((!body.trim() && attachments.length === 0) || !active) return;
    setText("");
    const files = [...attachments];
    setAttachments([]);

    // Отправляем файлы отдельными сообщениями
    for (const f of files) {
      const label = f.kind === "image" ? "📷 Фото" : f.kind === "video" ? "🎬 Видео" : "📄 Документ";
      const fileMsg: Msg = {
        id: Date.now() + Math.random(),
        customerId: active,
        body: `${label}: ${f.name}`,
        fromAdmin: true,
        kind: f.kind,
        createdAt: new Date().toISOString(),
      };
      setMsgs((m) => [...m, fileMsg]);
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: active, body: `${label}: ${f.name}`, kind: f.kind, mediaUrl: f.url }),
      });
    }

    if (body.trim()) {
      const optimistic: Msg = {
        id: Date.now(),
        customerId: active,
        body,
        fromAdmin: true,
        kind: "text",
        createdAt: new Date().toISOString(),
      };
      setMsgs((m) => [...m, optimistic]);
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: active, body }),
      });
    }

    setTyping(true);
    setTimeout(() => setTyping(false), 2200);
  };

  const filtered = useMemo(
    () => threads.filter((t) => `${t.name} ${t.username} ${t.city}`.toLowerCase().includes(q.toLowerCase())),
    [threads, q],
  );
  const current = threads.find((t) => t.id === active);

  return (
    <div className="grid gap-[var(--gap)] lg:grid-cols-[330px_1fr] h-[calc(100vh-140px)]">
      <Card hover={false} className={`!p-0 flex-col overflow-hidden ${mobile === "chat" ? "hidden lg:flex" : "flex"}`}>
        <div className="card-pad pb-3">
          <h2 className="font-semibold mb-3">Онлайн-чат</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
            <input className="input !pl-9" placeholder={tr("chat.searchDialog")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.map((t) => (
            <motion.button
              key={t.id}
              layout
              onClick={() => {
                setActive(t.id);
                setMobile("chat");
              }}
              whileHover={{ x: 3 }}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left mb-1"
              style={{
                background: active === t.id ? "linear-gradient(110deg, color-mix(in srgb, var(--primary) 85%, transparent), color-mix(in srgb, var(--accent) 70%, transparent))" : "transparent",
                color: active === t.id ? "#fff" : "inherit",
              }}
            >
              <div className="relative">
                <Avatar name={t.name} color={t.isVip ? "#f59e0b" : "#3b82f6"} size={40} />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2" style={{ background: "#22c55e", borderColor: "var(--bg)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="text-[0.85rem] font-medium truncate">{t.name}</span>
                  <span className="text-[0.68rem] opacity-70 whitespace-nowrap">{t.lastAt ? timeOnly(t.lastAt) : ""}</span>
                </div>
                <div className="text-xs opacity-70 truncate">{t.last ?? tr("chat.noMessages")}</div>
              </div>
              {Number(t.unread) > 0 && (
                <span className="chip !px-2" style={{ background: "var(--error)", color: "#fff", borderColor: "transparent" }}>
                  {t.unread}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </Card>

      <Card hover={false} className={`!p-0 flex-col overflow-hidden ${mobile === "list" ? "hidden lg:flex" : "flex"}`}>
        <div className="flex items-center gap-3 card-pad !py-3 border-b" style={{ borderColor: "rgba(var(--border))" }}>
          <button className="btn !px-2 lg:hidden" onClick={() => setMobile("list")}>
            <ArrowLeft size={16} />
          </button>
          {current && <Avatar name={current.name} color={current.isVip ? "#f59e0b" : "var(--primary)"} size={40} />}
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{current?.name ?? "Диалог"}</div>
            <div className="text-xs" style={{ color: "var(--success)" }}>
              {typing ? tr("chat.typing") : "онлайн"}
            </div>
          </div>
          {current && (
            <div className="hidden md:flex gap-2">
              <Badge color="#3b82f6">{SOURCE_LABEL[current.source] ?? current.source}</Badge>
              <Badge color="#8b5cf6">{current.city}</Badge>
              {current.isVip && <Badge color="#f59e0b">VIP</Badge>}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {loading && <div className="muted text-sm text-center">{tr("chat.loadingHistory")}</div>}
          <AnimatePresence initial={false}>
            {msgs.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`max-w-[74%] ${m.fromAdmin ? "self-end" : "self-start"}`}
              >
                <div
                  className="px-4 py-2.5 text-[0.88rem] leading-relaxed"
                  style={{
                    background: m.fromAdmin ? "linear-gradient(120deg,var(--primary),var(--accent))" : "rgba(var(--surface),0.85)",
                    color: m.fromAdmin ? "#fff" : "var(--text)",
                    border: m.fromAdmin ? "none" : "1px solid rgba(var(--border))",
                    borderRadius: m.fromAdmin ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                    boxShadow: "0 12px 30px -22px rgba(0,0,0,0.9)",
                  }}
                >
                  {m.body}
                </div>
                <div className={`flex items-center gap-1 mt-1 text-[0.68rem] muted ${m.fromAdmin ? "justify-end" : ""}`}>
                  {timeOnly(m.createdAt)} {m.fromAdmin && (Math.random() > 0.5 ? <CheckCheck size={12} /> : <Check size={12} />)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start flex gap-1 px-4 py-3 rounded-3xl" style={{ background: "rgba(var(--surface),0.8)" }}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
          <div ref={endRef} />
        </div>

        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {templates.map((t) => (
            <button key={t} className="chip shrink-0" style={{ color: "var(--primary)", borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)" }} onClick={() => send(t)}>
              <Zap size={12} /> {t}
            </button>
          ))}
        </div>

        {/* Превью выбранных файлов */}
        {attachments.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {attachments.map((f, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden" style={{ width: 60, height: 60, border: "1px solid rgba(var(--border))" }}>
                {f.kind === "image" ? (
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xl" style={{ background: "rgba(var(--table-row))" }}>
                    {f.kind === "video" ? "🎬" : "📄"}
                  </div>
                )}
                <button onClick={() => setAttachments(attachments.filter((_, x) => x !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full grid place-items-center text-[10px]"
                  style={{ background: "var(--error)", color: "#fff" }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 card-pad !pt-0">
          <label className="btn !px-2.5 cursor-pointer" title="Фото">
            <ImageIcon size={17} />
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="btn !px-2.5 cursor-pointer" title="Видео">
            <Film size={17} />
            <input type="file" accept="video/*" className="hidden" onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="btn !px-2.5 cursor-pointer" title="PDF / Документ">
            <FileText size={17} />
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <input
            className="input flex-1"
            placeholder={tr("chat.placeholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(text)}
          />
          <button className="btn !px-2.5" title="Голосовое">
            <Mic size={17} />
          </button>
          <motion.button whileTap={{ scale: 0.9 }} className="btn btn-primary !px-3.5" onClick={() => send(text)}>
            <Send size={17} />
          </motion.button>
        </div>
      </Card>
    </div>
  );
}
