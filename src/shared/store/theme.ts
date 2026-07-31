"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "auto";
export type Density = "compact" | "comfortable" | "spacious";

export interface ThemeState {
  mode: ThemeMode;
  primary: string;
  accent: string;
  radius: number;
  glass: number;
  density: Density;
  sidebarCollapsed: boolean;
  set: (patch: Partial<Omit<ThemeState, "set" | "reset" | "toggleSidebar">>) => void;
  toggleSidebar: () => void;
  reset: () => void;
}

const defaults = {
  mode: "dark" as ThemeMode,
  primary: "#8b5cf6",
  accent: "#3b82f6",
  radius: 24,
  glass: 0.55,
  density: "comfortable" as Density,
  sidebarCollapsed: false,
};

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      reset: () => set(defaults),
    }),
    { name: "delis-theme" },
  ),
);

export const PRESET_PRIMARY = ["#8b5cf6", "#6366f1", "#3b82f6", "#22c55e", "#f97316", "#ef4444", "#ec4899", "#14b8a6"];
