"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Toast {
  id: number;
  text: string;
  kind: "ok" | "err";
}

const ToastCtx = createContext<(text: string, kind?: "ok" | "err") => void>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass card-pad !py-3 flex items-center gap-3 text-sm max-w-sm pointer-events-auto"
              style={{
                borderColor:
                  t.kind === "ok"
                    ? "color-mix(in srgb, var(--success) 45%, transparent)"
                    : "color-mix(in srgb, var(--error) 45%, transparent)",
              }}
            >
              {t.kind === "ok" ? (
                <CheckCircle2 size={18} color="var(--success)" />
              ) : (
                <AlertCircle size={18} color="var(--error)" />
              )}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
