import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessagesSquare,
  Warehouse,
  UserCog,
  Wallet,
  BarChart3,
  Send,
  Globe,
  Smartphone,
  Camera,
  ShieldCheck,
  Settings,
  Bell,
  Sparkles,
  Truck,
  RotateCcw,
  Building2,
  CheckSquare,
  TrendingUp,
  BookOpen,
  Plug,
} from "lucide-react";

export type NavGroup = "overview" | "sales" | "communications" | "channels" | "management";

export interface NavItem {
  href: string;
  /** Ключ перевода: реальный текст берётся из TRANSLATIONS через t(`nav.${labelKey}`) */
  labelKey: string;
  icon: typeof LayoutDashboard;
  group: NavGroup;
  badge?: string;
  roles?: string[];
}

/** Разделы, доступные каждой роли (owner/admin видят всё) */
export const ROLE_ACCESS: Record<string, string[]> = {
  manager: ["/", "/company-os", "/analytics", "/tasks", "/knowledge", "/orders", "/products", "/warehouse", "/suppliers", "/delivery", "/returns", "/customers", "/agents", "/marketing", "/chat", "/broadcast", "/notifications", "/miniapp", "/website", "/instagram", "/settings"],
  warehouse: ["/", "/tasks", "/knowledge", "/products", "/warehouse", "/suppliers", "/returns", "/delivery", "/settings"],
  agent: ["/", "/tasks", "/knowledge", "/orders", "/customers", "/agents", "/chat", "/settings"],
  support: ["/", "/tasks", "/knowledge", "/chat", "/customers", "/orders", "/returns", "/notifications", "/settings"],
  moderator: ["/", "/tasks", "/knowledge", "/products", "/miniapp", "/website", "/instagram", "/marketing", "/broadcast", "/settings"],
  operator: ["/", "/tasks", "/knowledge", "/orders", "/customers", "/chat", "/delivery", "/settings"],
};

export function navForRole(role: string): NavItem[] {
  if (role === "owner" || role === "admin") return NAV;
  const allowed = ROLE_ACCESS[role];
  if (!allowed) return NAV;
  return NAV.filter((n) => allowed.includes(n.href));
}

export function canAccess(role: string, href: string): boolean {
  if (role === "owner" || role === "admin") return true;
  const allowed = ROLE_ACCESS[role];
  if (!allowed) return true;
  return allowed.includes(href);
}

export const NAV: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard, group: "overview" },
  { href: "/company-os", labelKey: "companyOS", icon: Sparkles, group: "overview" },
  { href: "/analytics", labelKey: "analytics", icon: BarChart3, group: "overview" },
  { href: "/pnl", labelKey: "pnl", icon: TrendingUp, group: "overview" },
  { href: "/knowledge", labelKey: "knowledge", icon: BookOpen, group: "overview" },
  { href: "/tasks", labelKey: "tasks", icon: CheckSquare, group: "overview" },
  { href: "/orders", labelKey: "orders", icon: ShoppingCart, group: "sales" },
  { href: "/products", labelKey: "products", icon: Package, group: "sales" },
  { href: "/warehouse", labelKey: "warehouse", icon: Warehouse, group: "sales" },
  { href: "/suppliers", labelKey: "suppliers", icon: Building2, group: "sales" },
  { href: "/customers", labelKey: "customers", icon: Users, group: "sales" },
  { href: "/agents", labelKey: "agents", icon: UserCog, group: "sales" },
  { href: "/marketing", labelKey: "marketing", icon: Sparkles, group: "sales" },
  { href: "/delivery", labelKey: "delivery", icon: Truck, group: "sales" },
  { href: "/returns", labelKey: "returns", icon: RotateCcw, group: "sales" },
  { href: "/chat", labelKey: "chat", icon: MessagesSquare, group: "communications" },
  { href: "/broadcast", labelKey: "broadcast", icon: Send, group: "communications" },
  { href: "/notifications", labelKey: "notifications", icon: Bell, group: "communications" },
  { href: "/miniapp", labelKey: "miniapp", icon: Smartphone, group: "channels" },
  { href: "/website", labelKey: "website", icon: Globe, group: "channels" },
  { href: "/instagram", labelKey: "instagram", icon: Camera, group: "channels" },
  { href: "/finance", labelKey: "finance", icon: Wallet, group: "management" },
  { href: "/users", labelKey: "users", icon: ShieldCheck, group: "management" },
  { href: "/integrations", labelKey: "integrations", icon: Plug, group: "management" },
  { href: "/agent-portal", labelKey: "agentPortal", icon: Smartphone, group: "management" },
  { href: "/settings", labelKey: "settings", icon: Settings, group: "management" },
];

export const NAV_GROUPS: NavGroup[] = ["overview", "sales", "communications", "channels", "management"];
