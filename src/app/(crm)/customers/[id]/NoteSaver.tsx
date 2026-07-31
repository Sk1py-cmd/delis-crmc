"use client";

import { useState } from "react";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";

export function NoteSaver({ id, initial }: { id: number; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <>
      <textarea className="input min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Комментарий по клиенту…" />
      <button
        className="btn btn-primary mt-3 w-full justify-center"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await postManage("saveNote", { id, notes });
            toast("Заметка сохранена — видна всем менеджерам");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Ошибка", "err");
          }
          setBusy(false);
        }}
      >
        {busy ? "Сохраняем…" : "Сохранить заметку"}
      </button>
    </>
  );
}
