"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Rocket, Image as ImageIcon } from "lucide-react";
import { Modal } from "@/shared/ui/kit";
import { MediaUploader, type MediaFile } from "@/shared/ui/MediaUploader";
import { SmartImage } from "@/shared/ui/SmartImage";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";

export function MiniAppActions() {
  const [preview, setPreview] = useState(false);
  const [banner, setBanner] = useState(false);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const publish = async () => {
    setBusy(true);
    try {
      await postManage("publishSite", { target: "miniapp" });
      toast("Mini App обновлён — изменения видны пользователям Telegram");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const saveBanners = async () => {
    if (media.length === 0) { toast("Загрузите баннеры", "err"); return; }
    setBusy(true);
    try {
      await postManage("saveMiniAppBanners", { banners: media.map((m) => m.url) });
      toast(`Загружено баннеров: ${media.length}`);
      setBanner(false);
      setMedia([]);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  return (
    <>
      <button className="btn" onClick={() => setBanner(true)}>
        <ImageIcon size={15} /> Баннеры
      </button>
      <button className="btn" onClick={() => setPreview(true)}>
        <Eye size={15} /> Предпросмотр
      </button>
      <button className="btn btn-primary" disabled={busy} onClick={publish}>
        <Rocket size={15} /> {busy ? "Публикуем…" : "Опубликовать"}
      </button>

      {banner && (
        <Modal open onClose={() => setBanner(false)} title="Баннеры Mini App" wide>
          <div className="flex flex-col gap-3.5">
            <p className="text-xs muted">Загрузите баннеры для главной страницы Mini App. Рекомендуемый размер 1200×600.</p>
            <MediaUploader files={media} onChange={setMedia} accept="image/*,video/*" max={6} />
            <button className="btn btn-primary justify-center" disabled={busy} onClick={saveBanners}>
              {busy ? "Сохраняем…" : "Сохранить баннеры"}
            </button>
          </div>
        </Modal>
      )}

      {preview && (
        <Modal open onClose={() => setPreview(false)} title="Предпросмотр Mini App">
          <div className="mx-auto rounded-[36px] p-3 w-[280px]" style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(0,0,0,0.4))", border: "1px solid rgba(var(--border))" }}>
            <div className="rounded-[28px] overflow-hidden" style={{ background: "var(--bg-2)" }}>
              <div className="p-4" style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
                <div className="text-white font-bold text-lg">DELIS</div>
                <div className="text-white/80 text-[0.7rem]">Химия для дома и авто</div>
              </div>
              {media[0] && (
                <div className="relative w-full h-28">
                  <SmartImage src={media[0].url} alt="Баннер мини-приложения" fill sizes="320px" className="object-cover" />
                </div>
              )}
              <div className="p-3 grid grid-cols-2 gap-2">
                {["🧴", "🚗", "✨", "🧺"].map((e, i) => (
                  <div key={i} className="rounded-2xl p-3 text-center" style={{ background: "rgba(var(--surface),0.9)", border: "1px solid rgba(var(--border))" }}>
                    <div className="text-2xl">{e}</div>
                    <div className="text-[0.6rem] mt-1 muted">Товар {i + 1}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-around py-2.5 text-[0.6rem] muted" style={{ borderTop: "1px solid rgba(var(--border))" }}>
                <span>🏠 Каталог</span><span>🛒 Корзина</span><span>📦 Заказы</span><span>👤 Профиль</span>
              </div>
            </div>
          </div>
          <p className="text-xs muted text-center mt-3">Так Mini App выглядит у клиентов в Telegram</p>
        </Modal>
      )}
    </>
  );
}
