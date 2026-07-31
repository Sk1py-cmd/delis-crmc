"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Доброе утро";
  if (hour >= 12 && hour < 17) return "Добрый день";
  if (hour >= 17 && hour < 22) return "Добрый вечер";
  return "Доброй ночи";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function LiveClock({ name }: { name: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass card-pad flex flex-wrap items-center justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {greeting(h)}, {name.split(" ")[0]} 👋
        </h1>
        <p className="muted text-sm mt-1">
          {dayNames[now.getDay()]}, {now.getDate()} {monthNames[now.getMonth()]} {now.getFullYear()} · DELIS Company OS
        </p>
      </div>
      <div className="text-right">
        <div className="text-4xl md:text-5xl font-light tracking-tight tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
          {pad(h)}:{pad(now.getMinutes())}
          <span className="text-lg muted font-normal ml-1">:{pad(now.getSeconds())}</span>
        </div>
        <div className="muted text-xs mt-0.5">Ташкент · UTC+5</div>
      </div>
    </motion.div>
  );
}
