"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, ScanLine } from "lucide-react";
import { Modal } from "@/shared/ui/kit";

export function BarcodeScannerModal({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (code: string) => void }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!open) return;
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1 },
      false,
    );
    scannerRef.current = scanner;

    scanner.render(
      (code) => {
        scanner.clear();
        onScan(code);
        onClose();
      },
      () => {},
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [open, onScan, onClose]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Сканирование штрихкода">
      <div className="flex flex-col gap-4">
        <p className="muted text-xs">Наведите камеру устройства на штрихкод или QR-код товара.</p>
        <div id="reader" className="w-full overflow-hidden rounded-2xl bg-black" />
        <button className="btn w-full justify-center" onClick={onClose}>
          Отмена
        </button>
      </div>
    </Modal>
  );
}
