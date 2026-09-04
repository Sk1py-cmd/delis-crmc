"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/shared/store/locale";
import { AUTO_TRANSLATIONS } from "./autoTranslations";
import { translateText } from "./translateText";

const ATTRS = ["placeholder", "title", "aria-label"] as const;

export function AutoTranslator() {
  const { locale } = useLocale();
  const originalRef = useRef(new WeakMap<Node, string>());
  const attrOriginalRef = useRef(new WeakMap<Element, Map<string, string>>());
  const isRunningRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    const dict = locale === "ru" ? null : AUTO_TRANSLATIONS[locale];

    const skip = (el: Element | null) => {
      if (!el) return true;
      const tag = el.tagName;
      return (
        ["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT", "OPTION", "SELECT"].includes(tag) ||
        el.closest("[data-no-translate]") !== null
      );
    };

    const walk = () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) nodes.push(node as Text);

        for (const textNode of nodes) {
          if (skip(textNode.parentElement)) continue;
          const current = textNode.nodeValue ?? "";
          if (!originalRef.current.has(textNode)) {
            originalRef.current.set(textNode, current);
          }
          const original = originalRef.current.get(textNode) ?? current;
          const translated = dict ? translateText(original, dict) : original;
          if (textNode.nodeValue !== translated) {
            textNode.nodeValue = translated;
          }
        }

        const elements = document.querySelectorAll<HTMLElement>("*");
        for (const el of elements) {
          if (skip(el)) continue;
          let originals = attrOriginalRef.current.get(el);
          if (!originals) {
            originals = new Map<string, string>();
            attrOriginalRef.current.set(el, originals);
          }
          for (const attr of ATTRS) {
            const value = el.getAttribute(attr);
            if (!value) continue;
            if (!originals.has(attr)) originals.set(attr, value);
            const original = originals.get(attr) ?? value;
            const translated = dict ? translateText(original, dict) : original;
            if (el.getAttribute(attr) !== translated) {
              el.setAttribute(attr, translated);
            }
          }
        }
      } finally {
        isRunningRef.current = false;
      }
    };

    const scheduleWalk = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(walk);
    };

    scheduleWalk();
    const observer = new MutationObserver(() => {
      if (!isRunningRef.current) scheduleWalk();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: false });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [locale]);

  return null;
}
