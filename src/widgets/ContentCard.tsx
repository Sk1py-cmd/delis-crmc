"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Badge, Modal } from "@/shared/ui/kit";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";

export function ContentCard({
  id,
  title,
  body,
  enabled,
  statusLabel,
  updatedAt,
}: {
  id?: number;
  title: string;
  body: string;
  enabled: boolean;
  statusLabel?: string;
  updatedAt?: string;
}) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ title, body, enabled });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const save = async () => {
    setBusy(true);
    try {
      if (id) await postManage("updateContent", { id, ...form });
      toast(`«${form.title}» сохранено и синхронизировано со всеми каналами`);
      setEdit(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-3xl p-4" style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate">{form.title}</span>
        <Badge color={form.enabled ? "#22c55e" : "#ef4444"}>{statusLabel ?? (form.enabled ? "Активно" : "Выключено")}</Badge>
      </div>
      <p className="muted text-xs mt-2 line-clamp-2">{form.body}</p>
      {updatedAt && <div className="text-[0.68rem] muted mt-2">Обновлено {updatedAt}</div>}
      <button className="btn w-full justify-center mt-3" onClick={() => setEdit(true)}>
        <Pencil size={13} /> Редактировать
      </button>

      {edit && (
        <Modal open onClose={() => setEdit(false)} title={`Редактирование: ${title}`}>
          <div className="flex flex-col gap-3.5">
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="input min-h-28" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <button
              className="btn justify-between"
              style={form.enabled ? { background: "linear-gradient(120deg,var(--primary),var(--accent))", color: "#fff", borderColor: "transparent" } : {}}
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
            >
              {form.enabled ? "Включено — нажмите, чтобы выключить" : "Выключено — нажмите, чтобы включить"}
            </button>
            <button className="btn btn-primary justify-center" disabled={busy} onClick={save}>
              {busy ? "Сохраняем…" : "Сохранить и опубликовать"}
            </button>
            <p className="text-xs muted text-center">Изменение мгновенно синхронизируется: CRM · Telegram Bot · Mini App · Сайт</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
