"use client";

import { useCallback, useEffect } from "react";
import { useLocale } from "@/shared/store/locale";
import { TRANSLATIONS, DEFAULT_LOCALE } from "./locales";

/** Хук перевода: t("nav.dashboard") → строка на текущем языке */
export function useT() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return useCallback(
    (key: string) => {
      return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS[DEFAULT_LOCALE]?.[key] ?? key;
    },
    [locale],
  );
}
