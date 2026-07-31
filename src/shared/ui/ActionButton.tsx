"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useToast } from "@/shared/ui/Toast";

export function ActionButton({
  children,
  message,
  className,
  primary,
}: {
  children: ReactNode;
  message: string;
  className?: string;
  primary?: boolean;
}) {
  const toast = useToast();
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={clsx("btn", primary && "btn-primary", className)}
      onClick={() => toast(message)}
    >
      {children}
    </motion.button>
  );
}
