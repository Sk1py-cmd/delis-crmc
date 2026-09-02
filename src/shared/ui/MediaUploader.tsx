"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, FileText, Film, ImageIcon, Play, Download } from "lucide-react";
import { useToast } from "@/shared/ui/Toast";
import { SmartImage } from "@/shared/ui/SmartImage";

export interface MediaFile {
  url: string;
  kind: "image" | "video" | "pdf";
  name: string;
  size: number;
}

const KIND_ICON = { image: ImageIcon, video: Film, pdf: FileText };
const KIND_COLOR = { image: "#8b5cf6", video: "#f97316", pdf: "#ef4444" };

export function MediaUploader({
  files,
  onChange,
  accept = "image/*,video/*,application/pdf",
  max = 8,
  compact = false,
}: {
  files: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  accept?: string;
  max?: number;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    if (files.length >= max) {
      toast(`Максимум ${max} файлов`, "err");
      return;
    }

    setUploading(true);
    const added: MediaFile[] = [];
    const arr = Array.from(list).slice(0, max - files.length);

    for (let i = 0; i < arr.length; i++) {
      setProgress(Math.round(((i + 1) / arr.length) * 100));
      const fd = new FormData();
      fd.append("file", arr[i]);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = (await res.json()) as { ok?: boolean; url?: string; kind?: string; name?: string; size?: number; error?: string };
        if (d.ok && d.url) {
          added.push({ url: d.url, kind: (d.kind as MediaFile["kind"]) ?? "image", name: d.name ?? arr[i].name, size: d.size ?? arr[i].size });
        } else {
          toast(d.error ?? `Ошибка загрузки ${arr[i].name}`, "err");
        }
      } catch {
        toast(`Ошибка сети при загрузке ${arr[i].name}`, "err");
      }
    }

    if (added.length) {
      onChange([...files, ...added]);
      toast(`Загружено файлов: ${added.length}`);
    }
    setUploading(false);
    setProgress(0);
  };

  const remove = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        className="rounded-3xl text-center cursor-pointer transition-colors relative"
        style={{
          border: `2px dashed ${dragging ? "var(--primary)" : "rgba(var(--border))"}`,
          background: dragging ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "rgba(var(--table-row))",
          padding: compact ? 16 : 24,
        }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.005 }}
      >
        <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={compact ? 22 : 28} className="animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm muted">Загружаем… {progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload size={compact ? 20 : 26} className="muted" />
            <span className="text-sm font-medium">{dragging ? "Отпустите файлы" : "Перетащите или выберите файлы"}</span>
            <span className="text-xs muted">📷 Фото 5MB · 🎬 Видео 25MB · 📄 PDF 10MB</span>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2">
            {files.map((f, i) => {
              const Icon = KIND_ICON[f.kind];
              const color = KIND_COLOR[f.kind];
              return (
                <motion.div key={i} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  className="relative group rounded-2xl overflow-hidden"
                  style={{ width: 92, height: 92, border: `2px solid ${i === 0 ? "var(--primary)" : "rgba(var(--border))"}` }}>

                  {f.kind === "image" ? (
                    <SmartImage src={f.url} alt={f.name} fill sizes="120px" className="object-cover" />
                  ) : f.kind === "video" ? (
                    <div className="w-full h-full relative" style={{ background: "#000" }}>
                      <video src={f.url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 grid place-items-center">
                        <Play size={22} color="#fff" fill="#fff" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full grid place-items-center" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
                      <Icon size={26} color={color} />
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[0.58rem] truncate text-white" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                    {f.name}
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); remove(i); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "var(--error)", color: "#fff" }}>
                    <X size={11} />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {files.length > 0 && (
        <div className="text-xs muted">
          {files.length} из {max} файлов · {(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB
        </div>
      )}
    </div>
  );
}

/** Просмотр медиа в сообщениях чата */
export function MediaPreview({ file }: { file: MediaFile }) {
  const [open, setOpen] = useState(false);

  if (file.kind === "image") {
    return (
      <>
        <SmartImage
          src={file.url}
          alt={file.name}
          width={480}
          height={240}
          className="rounded-2xl max-w-full h-auto cursor-pointer"
          style={{ maxHeight: 240, width: "auto" }}
          onClick={() => setOpen(true)}
        />
        {open && (
          <div className="fixed inset-0 z-[200] grid place-items-center p-6" style={{ background: "rgba(0,0,0,0.9)" }} onClick={() => setOpen(false)}>
            <SmartImage
              src={file.url}
              alt={file.name}
              width={1600}
              height={1200}
              className="max-w-full max-h-full w-auto h-auto rounded-2xl"
            />
          </div>
        )}
      </>
    );
  }

  if (file.kind === "video") {
    return <video src={file.url} controls className="rounded-2xl max-w-full" style={{ maxHeight: 280 }} />;
  }

  return (
    <a href={file.url} download={file.name} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
      <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: "color-mix(in srgb, #ef4444 15%, transparent)" }}>
        <FileText size={20} color="#ef4444" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="text-xs muted">{(file.size / 1024).toFixed(0)} KB · PDF</div>
      </div>
      <Download size={16} className="muted" />
    </a>
  );
}
