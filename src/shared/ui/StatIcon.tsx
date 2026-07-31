"use client";

import {
  DollarSign, TrendingUp, ShoppingCart, Users, ArrowDownLeft, Package,
  Wallet, BarChart3, Target, Gift, Zap, Star, Truck, RotateCcw,
  Building2, MapPin, Clock, Bell, FileText, CreditCard, Banknote,
  ShieldCheck, Percent, Activity, Layers, Box, UserCheck,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "💰": DollarSign,
  "📈": TrendingUp,
  "🧾": ShoppingCart,
  "👥": Users,
  "💸": ArrowDownLeft,
  "📦": Package,
  "📊": BarChart3,
  "🎯": Target,
  "🎁": Gift,
  "⚡": Zap,
  "⭐": Star,
  "✈️": Zap,
  "🚚": Truck,
  "🔁": RotateCcw,
  "🏭": Building2,
  "📍": MapPin,
  "⏱️": Clock,
  "📢": Bell,
  "🧾📋": FileText,
  "💳": CreditCard,
  "💵": Banknote,
  "🔐": ShieldCheck,
  "🏷️": Percent,
  "📸": Activity,
  "⚠️": Bell,
  "🤖": Zap,
  "🔔": Bell,
  "🗺️": MapPin,
  "📱": Layers,
  "🧑‍💼": UserCheck,
  "🤝": Users,
  "🛒": ShoppingCart,
  "📋": FileText,
  "📚": Layers,
  "📌": MapPin,
  "👁️": Activity,
  "🗂️": Box,
  "🔌": Zap,
  "✅": ShieldCheck,
  "⏳": Clock,
  "🔥": Zap,
};

export function StatIcon({ emoji, size = 18, color }: { emoji: string; size?: number; color?: string }) {
  const Icon = MAP[emoji];
  if (!Icon) return <span style={{ fontSize: size * 0.9 }}>{emoji}</span>;

  return (
    <div
      style={{
        width: size + 14,
        height: size + 14,
        borderRadius: (size + 14) * 0.36,
        display: "grid",
        placeItems: "center",
        background: color ? `color-mix(in srgb, ${color} 16%, transparent)` : "rgba(var(--table-row))",
        border: `1px solid ${color ? `color-mix(in srgb, ${color} 30%, transparent)` : "rgba(var(--border))"}`,
        flexShrink: 0,
      }}
    >
      <Icon size={size} color={color ?? "var(--primary)"} />
    </div>
  );
}
