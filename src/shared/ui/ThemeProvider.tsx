"use client";

import { useEffect } from "react";
import { useTheme } from "@/shared/store/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, primary, accent, radius, glass, density } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved =
        mode === "auto"
          ? window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark"
          : mode;
      root.dataset.theme = resolved;
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--radius", `${radius}px`);
    root.style.setProperty("--glass", String(glass));
    root.dataset.density = density;
  }, [primary, accent, radius, glass, density]);

  return <>{children}</>;
}
