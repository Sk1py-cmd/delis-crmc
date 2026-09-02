"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Calendar, ExternalLink } from "lucide-react";
import { Modal } from "@/shared/ui/kit";
import { MediaUploader, type MediaFile } from "@/shared/ui/MediaUploader";
import { SmartImage } from "@/shared/ui/SmartImage";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";

const POST_TYPES = [
  { key: "post", label: "📷 Пост в ленту" },
  { key: "story", label: "⚡ Сторис (24ч)" },
  { key: "reels", label: "🎬 Reels видео" },
  { key: "carousel", label: "🖼️ Карусель" },
];

export function InstagramActions() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    type: "post",
    caption: "💜 Новинка от DELIS!\n\nПрофессиональная автохимия для идеального блеска.\n\n#delis #автохимия #ташкент",
    scheduledAt: "",
  });
  const [media, setMedia] = useState<MediaFile[]>([]);
  const toast = useToast();
  const router = useRouter();

  const publish = async (now: boolean) => {
    if (!form.caption.trim()) { toast("Добавьте текст публикации", "err"); return; }
    if (media.length === 0) { toast("Загрузите фото или видео", "err"); return; }
    setBusy(true);
    try {
      await postManage("createInstagramPost", {
        type: form.type,
        caption: form.caption,
        mediaUrls: media.map((m) => m.url),
        mediaKinds: media.map((m) => m.kind),
        scheduledAt: now ? "" : form.scheduledAt,
      });
      toast(now ? "Публикация отправлена в Instagram 🚀" : `Запланировано на ${new Date(form.scheduledAt).toLocaleString("ru-RU")}`);
      setOpen(false);
      setMedia([]);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  return (
    <>
      <a href="https://instagram.com/delis.uz" target="_blank" rel="noreferrer" className="btn">
        <ExternalLink size={15} /> Профиль
      </a>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> Создать публикацию
      </button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Новая публикация в Instagram" wide>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1.5">Тип публикации</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {POST_TYPES.map((t) => (
                  <button key={t.key} onClick={() => setForm({ ...form, type: t.key })}
                    className="rounded-2xl py-2.5 text-xs font-medium"
                    style={{
                      background: form.type === t.key ? "linear-gradient(120deg,#ec4899,#8b5cf6)" : "rgba(var(--table-row))",
                      color: form.type === t.key ? "#fff" : "var(--muted)",
                      border: "1px solid rgba(var(--border))",
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1.5">Фото / Видео</label>
              <MediaUploader files={media} onChange={setMedia} accept="image/*,video/*" max={10} />
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1.5">
                Подпись · {form.caption.length}/2200
              </label>
              <textarea className="input min-h-32" maxLength={2200} value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })} />
            </div>

            {/* Превью */}
            {media.length > 0 && (
              <div className="rounded-3xl p-4" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
                <div className="text-xs muted mb-2">Предпросмотр Instagram</div>
                <div className="max-w-[280px] rounded-2xl overflow-hidden" style={{ background: "#000" }}>
                  {media[0].kind === "video" ? (
                    <video src={media[0].url} className="w-full aspect-square object-cover" muted controls />
                  ) : (
                    <div className="relative w-full aspect-square">
                      <SmartImage src={media[0].url} alt="Превью публикации" fill sizes="280px" className="object-cover" />
                    </div>
                  )}
                  <div className="p-3 text-xs text-white whitespace-pre-line line-clamp-4">
                    <b>delis.uz</b> {form.caption}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1.5">Запланировать (необязательно)</label>
              <input type="datetime-local" className="input" value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <button className="btn btn-primary flex-1 justify-center" disabled={busy} onClick={() => publish(true)}>
                <Send size={15} /> {busy ? "Публикуем…" : "Опубликовать сейчас"}
              </button>
              {form.scheduledAt && (
                <button className="btn" disabled={busy} onClick={() => publish(false)}>
                  <Calendar size={15} /> Запланировать
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
