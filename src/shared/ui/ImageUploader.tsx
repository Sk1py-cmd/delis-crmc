"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImagePlus, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/shared/ui/Toast";

interface Props {
  productId?: number;
  images: string[];
  onChange: (images: string[]) => void;
}

const isUrl = (v: string) => /^https?:\/\//.test(v) || v.startsWith("data:image");

export function ImageUploader({ productId, images, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast(`${file.name} — не изображение`, "err"); continue; }
      if (file.size > 4 * 1024 * 1024) { toast(`${file.name} — слишком большой (max 4MB)`, "err"); continue; }
      const fd = new FormData();
      fd.append("file", file);
      if (productId) fd.append("productId", String(productId));
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (d.url) newUrls.push(d.url);
        else toast(d.error ?? "Ошибка загрузки", "err");
      } catch { toast("Ошибка сети", "err"); }
    }
    if (newUrls.length) {
      onChange([...images, ...newUrls].slice(-6));
      toast(`${newUrls.length} фото загружено`);
    }
    setUploading(false);
  };

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const move = (from: number, to: number) => {
    const arr = [...images];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <motion.div
        className="rounded-3xl p-6 text-center cursor-pointer transition-colors relative overflow-hidden"
        style={{
          border: `2px dashed ${dragging ? "var(--primary)" : "rgba(var(--border))"}`,
          background: dragging ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "rgba(var(--table-row))",
        }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm muted">Загружаем…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={dragging ? { scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {dragging ? <ImagePlus size={32} style={{ color: "var(--primary)" }} /> : <Upload size={28} className="muted" />}
            </motion.div>
            <span className="text-sm font-medium">
              {dragging ? "Отпустите для загрузки" : "Перетащите фото или кликните"}
            </span>
            <span className="text-xs muted">JPG, PNG, WEBP · до 4MB · максимум 6 фото</span>
          </div>
        )}
      </motion.div>

      {/* Gallery */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
                style={{ width: 84, height: 84 }}
              >
                {isUrl(img) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={`Фото ${i + 1}`}
                    className="w-full h-full object-cover rounded-2xl"
                    style={{ border: i === 0 ? "2px solid var(--primary)" : "2px solid rgba(var(--border))" }}
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl grid place-items-center text-3xl" style={{ background: "rgba(var(--table-row))", border: "2px solid rgba(var(--border))" }}>
                    {img}
                  </div>
                )}
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "var(--primary)" }}>
                    Главное
                  </span>
                )}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1" style={{ background: "rgba(0,0,0,0.5)" }}>
                  {i > 0 && (
                    <button onClick={() => move(i, i - 1)} className="w-7 h-7 rounded-full bg-white/20 text-white text-xs font-bold grid place-items-center" title="Переместить влево">
                      ←
                    </button>
                  )}
                  <button onClick={() => remove(i)} className="w-7 h-7 rounded-full text-white grid place-items-center" style={{ background: "var(--error)" }} title="Удалить">
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
            {images.length < 6 && (
              <motion.button
                layout
                onClick={() => inputRef.current?.click()}
                className="grid place-items-center rounded-2xl"
                style={{ width: 84, height: 84, background: "rgba(var(--table-row))", border: "2px dashed rgba(var(--border))" }}
                whileHover={{ borderColor: "var(--primary)" }}
              >
                <ImagePlus size={22} className="muted" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {images.length > 0 && (
        <div className="flex items-center gap-2 text-xs muted">
          <CheckCircle2 size={14} color="var(--success)" />
          {images.length} фото · первое используется как обложка
        </div>
      )}
    </div>
  );
}
