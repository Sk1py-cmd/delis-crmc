"use client";

import { motion, useMotionValue, useSpring, useInView, HTMLMotionProps } from "framer-motion";
import { useEffect, useRef, useState, ReactNode } from "react";
import clsx from "clsx";

export function Card({
  className,
  children,
  hover = true,
  delay = 0,
  ...rest
}: { className?: string; children: ReactNode; hover?: boolean; delay?: number } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -3, transition: { duration: 0.2 } } : undefined}
      className={clsx("glass card-pad", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({
  value,
  format = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n)),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 70, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => spring.on("change", (v) => setDisplay(format(v))), [spring, format]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="chip"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </motion.div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("rounded-2xl overflow-hidden relative", className)}
      style={{ background: "rgba(var(--surface),0.5)" }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)" }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
      />
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string; count?: number }[];
  value: string;
  onChange: (k: string) => void;
}) {
  const id = useRef(`tabs-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar p-1 rounded-full" style={{ background: "rgba(var(--surface),0.5)", border: "1px solid rgba(var(--border))" }}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          className="relative px-3.5 py-1.5 text-[0.8rem] font-semibold rounded-full whitespace-nowrap transition-colors"
          style={{ color: value === it.key ? "#fff" : "var(--muted)" }}
        >
          {value === it.key && (
            <motion.span
              layoutId={id}
              className="absolute inset-0 rounded-full"
              style={{ background: "linear-gradient(120deg,var(--primary),var(--accent))" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
          <span className="relative z-10">
            {it.label}
            {typeof it.count === "number" && <span className="opacity-60"> · {it.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(2,2,8,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className={clsx("glass card-pad w-full max-h-[88vh] overflow-y-auto", wide ? "max-w-4xl" : "max-w-lg")}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Progress({ value, color = "var(--primary)" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(var(--border))" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, var(--accent))` }}
      />
    </div>
  );
}

export function Avatar({ name, color = "#8b5cf6", size = 38 }: { name: string; color?: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex items-center justify-center font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        fontSize: size * 0.36,
        color: "#fff",
        background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 40%, #111))`,
        boxShadow: `0 8px 20px -10px ${color}`,
      }}
    >
      {initials}
    </div>
  );
}
