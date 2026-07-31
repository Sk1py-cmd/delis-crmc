"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS: Record<string, string> = {
  "g d": "/",
  "g o": "/orders",
  "g p": "/products",
  "g w": "/warehouse",
  "g c": "/customers",
  "g a": "/agents",
  "g m": "/chat",
  "g f": "/finance",
  "g s": "/settings",
  "g u": "/users",
};

export function useKeyboardShortcuts() {
  const router = useRouter();
  const buffer = useRef<string[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") return;

      buffer.current.push(e.key.toLowerCase());
      buffer.current = buffer.current.slice(-2);
      const seq = buffer.current.join(" ");

      if (SHORTCUTS[seq]) {
        e.preventDefault();
        router.push(SHORTCUTS[seq]);
        buffer.current = [];
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);
}

export { SHORTCUTS };
