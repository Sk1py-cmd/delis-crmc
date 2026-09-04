"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Rocket, Save } from "lucide-react";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";

export function WebsiteHeaderActions() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const publish = async () => {
    setBusy(true);
    try {
      await postManage("publishSite", { target: "website" });
      toast("Сайт опубликован — изменения видны на delis.uz");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка публикации", "err");
    }
    setBusy(false);
  };

  return (
    <>
      <a href="https://delis.uz" target="_blank" rel="noreferrer" className="btn">
        <ExternalLink size={15} /> Открыть delis.uz
      </a>
      <button className="btn btn-primary" disabled={busy} onClick={publish}>
        <Rocket size={15} /> {busy ? "Публикуем…" : "Опубликовать"}
      </button>
    </>
  );
}

export function SeoForm({ initial }: { initial: Record<string, string> }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const FIELDS = [
    { key: "title", label: "Meta Title", placeholder: "DELIS — профессиональная химия" },
    { key: "description", label: "Meta Description", placeholder: "Каталог DELIS: автошампуни, воски…" },
    { key: "ogImage", label: "OG Image URL", placeholder: "og-delis-2026.jpg · 1200×630" },
    { key: "robots", label: "Robots.txt", placeholder: "User-agent: * / Allow: /" },
    { key: "sitemap", label: "Sitemap.xml", placeholder: "Генерируется автоматически" },
    { key: "canonical", label: "Canonical URL", placeholder: "https://delis.uz" },
  ];

  const save = async () => {
    setBusy(true);
    try {
      await postManage("saveSeo", { seo: form });
      toast("SEO-настройки сохранены и применены к сайту");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="text-[0.7rem] uppercase tracking-wider muted">{f.label}</div>
            <input
              className="input mt-1"
              placeholder={f.placeholder}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button className="btn btn-primary w-full justify-center mt-4" disabled={busy} onClick={save}>
        <Save size={15} /> {busy ? "Сохраняем…" : "Сохранить SEO"}
      </button>
    </>
  );
}
