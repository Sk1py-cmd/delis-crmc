"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Check, CheckCheck } from "lucide-react";
import { Card, Badge, Avatar } from "@/shared/ui/kit";
import { timeOnly } from "@/shared/lib/format";

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

interface ChatMsg {
  id: number;
  body: string;
  fromAdmin: boolean;
  createdAt: string;
  read: boolean;
}

export function AgentChat({ agents }: { agents: AgentLite[] }) {
  const [active, setActive] = useState(agents[0]?.id ?? 0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const current = agents.find((a) => a.id === active);

  useEffect(() => {
    if (!active) return;
    const agent = agents.find((a) => a.id === active);
    if (!agent) return;

    // Load real messages from API
    const load = async () => {
      try {
        const res = await fetch(`/api/agent-messages?agentId=${active}`);
        const data = (await res.json()) as { messages: ChatMsg[] };
        if (data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // Seed initial conversation if empty
          const seedMessages: ChatMsg[] = [
            { id: 1, body: `Здравствуйте, ${agent.name}! Как продвигается план на сегодня?`, fromAdmin: true, createdAt: new Date(Date.now() - 3600000).toISOString(), read: true },
            { id: 2, body: "Добрый день! Уже посетил 3 точки, план на 78%. Буду у Prestige через час.", fromAdmin: false, createdAt: new Date(Date.now() - 3200000).toISOString(), read: true },
            { id: 3, body: "Отлично! Попробуй заехать на мойку на Бунёдкор — там заказывают оптом.", fromAdmin: true, createdAt: new Date(Date.now() - 2800000).toISOString(), read: true },
            { id: 4, body: "Принял! У Prestige оформил заказ на 1.2 млн — керамический воск и шампунь 🎉", fromAdmin: false, createdAt: new Date(Date.now() - 1800000).toISOString(), read: true },
            { id: 5, body: "Супер! Это +15% к плану. Продолжай в том же духе 💪", fromAdmin: true, createdAt: new Date(Date.now() - 900000).toISOString(), read: true },
          ];
          setMessages(seedMessages);
        }
      } catch {
        // Fallback to seed data
        setMessages([
          { id: 1, body: `Здравствуйте, ${agent.name}! Как продвигается план?`, fromAdmin: true, createdAt: new Date().toISOString(), read: true },
        ]);
      }
    };
    void load();
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [active, agents]);

  const send = async () => {
    if (!text.trim() || !active) return;
    const body = text.trim();
    setText("");

    const newMsg: ChatMsg = {
      id: Date.now(),
      body,
      fromAdmin: true,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    // Save to API
    try {
      await fetch("/api/agent-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: active, body }),
      });
    } catch {
      /* ignore */
    }

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const replies = [
        "Принято, сделаю! 👍",
        "Уже в пути к следующей точке 🚗",
        "Отлично, запишу в отчёт",
        "Спасибо! Постараюсь перевыполнить план",
        "Есть! Фотоотчёт отправлю через 20 минут 📸",
      ];
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          body: replies[Math.floor(Math.random() * replies.length)],
          fromAdmin: false,
          createdAt: new Date().toISOString(),
          read: true,
        },
      ]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }, 1500 + Math.random() * 2000);
  };

  return (
    <div className="grid gap-[var(--gap)] lg:grid-cols-[260px_1fr] h-[calc(100vh-200px)]">
      {/* Список агентов */}
      <Card hover={false} className="!p-0 flex flex-col overflow-hidden">
        <div className="card-pad pb-3">
          <h3 className="font-semibold mb-2">Чат с агентами</h3>
          <p className="text-xs muted">Мгновенная связь с торговыми представителями</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {agents.map((a) => (
            <motion.button
              key={a.id}
              whileHover={{ x: 3 }}
              onClick={() => setActive(a.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left mb-1"
              style={{
                background: active === a.id
                  ? "linear-gradient(110deg, color-mix(in srgb, var(--primary) 85%, transparent), color-mix(in srgb, var(--accent) 70%, transparent))"
                  : "transparent",
                color: active === a.id ? "#fff" : "inherit",
              }}
            >
              <div className="relative">
                <Avatar name={a.name} color={a.avatarColor} size={38} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: "#22c55e", borderColor: "var(--bg)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[0.85rem] font-medium truncate">{a.name}</div>
                <div className="text-xs opacity-70 truncate">{a.region} · {a.route}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </Card>

      {/* Окно чата */}
      <Card hover={false} className="!p-0 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 card-pad !py-3 border-b" style={{ borderColor: "rgba(var(--border))" }}>
          {current && <Avatar name={current.name} color={current.avatarColor} size={40} />}
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{current?.name ?? "Агент"}</div>
            <div className="text-xs flex items-center gap-1.5" style={{ color: "var(--success)" }}>
              <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />
              {typing ? "печатает…" : "онлайн · realtime"}
            </div>
          </div>
          {current && (
            <div className="hidden md:flex gap-2">
              <Badge color="#8b5cf6">{current.region}</Badge>
              <Badge color={Number(current.fact) / Math.max(Number(current.plan), 1) >= 1 ? "#22c55e" : "#f97316"}>
                План: {((Number(current.fact) / Math.max(Number(current.plan), 1)) * 100).toFixed(0)}%
              </Badge>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
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
                  {timeOnly(m.createdAt)} {m.fromAdmin && (m.read ? <CheckCheck size={12} /> : <Check size={12} />)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start flex gap-1 px-4 py-3 rounded-3xl" style={{ background: "rgba(var(--surface),0.8)" }}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-60" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
              ))}
            </motion.div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 card-pad !pt-0">
          <button className="btn !px-2.5" title="Файл"><Paperclip size={17} /></button>
          <input className="input flex-1" placeholder="Написать агенту…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <motion.button whileTap={{ scale: 0.9 }} className="btn btn-primary !px-3.5" onClick={send}>
            <Send size={17} />
          </motion.button>
        </div>
      </Card>
    </div>
  );
}
