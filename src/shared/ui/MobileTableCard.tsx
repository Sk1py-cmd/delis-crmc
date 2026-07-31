import { ReactNode } from "react";
import { motion } from "framer-motion";

export function MobileTableCard({ children, index = 0, actions }: { children: ReactNode; index?: number; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="glass card-pad flex flex-col gap-2.5 sm:hidden"
    >
      {children}
      {actions && (
        <div className="flex gap-2 mt-2 pt-3" style={{ borderTop: "1px dashed rgba(var(--border))" }}>
          {actions}
        </div>
      )}
    </motion.div>
  );
}

export function MobileFieldRow({ label, value, span }: { label: string; value: ReactNode; span?: boolean }) {
  return (
    <div className={span ? "flex flex-col gap-1" : "flex justify-between items-center gap-4"}>
      <span className="text-xs muted whitespace-nowrap">{label}</span>
      <span className={span ? "text-sm" : "text-sm font-medium text-right"}>{value}</span>
    </div>
  );
}
