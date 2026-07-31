"use client";

import { useEffect, useRef } from "react";

interface VisitMarker {
  id: number;
  agentName: string;
  storeName: string;
  storeAddress: string;
  gpsCoords: string;
  status: string;
  orderTotal: string;
  visitedAt: string;
}

function parseCoords(gps: string): [number, number] | null {
  if (!gps) return null;
  const parts = gps.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  return null;
}

export function LeafletMap({ visits, height = 480 }: { visits: VisitMarker[]; height?: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    const init = async () => {
      const L = (await import("leaflet")) as unknown as typeof import("leaflet");
      await import("leaflet/dist/leaflet.css" as string);

      if (cancelled || !mapRef.current) return;

      if (instanceRef.current) {
        (instanceRef.current as { remove: () => void }).remove();
        instanceRef.current = null;
      }

      const coords = visits.map((v) => parseCoords(v.gpsCoords)).filter(Boolean) as [number, number][];
      const center: [number, number] = coords.length > 0 ? coords[0] : [41.2995, 69.2401];

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(center, coords.length > 0 ? 12 : 13);
      instanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      const leaflet = L as unknown as typeof import("leaflet");
      const customIcon = (color: string) =>
        leaflet.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 4px 14px ${color}88;display:flex;align-items:center;justify-content:center"><span style="font-size:13px;color:#fff;font-weight:700">📍</span></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

      const COLORS: Record<string, string> = { order_placed: "#22c55e", completed: "#8b5cf6", no_order: "#ef4444" };

      visits.forEach((v) => {
        const c = parseCoords(v.gpsCoords);
        if (!c) return;
        const hasOrder = Number(v.orderTotal) > 0;
        const color = hasOrder ? "#22c55e" : v.status === "completed" ? "#8b5cf6" : "#ef4444";
        const marker = L.marker(c, { icon: customIcon(color) }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:Inter,system-ui,sans-serif;min-width:180px">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px">${v.storeName}</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">📍 ${v.storeAddress}</div>
            <div style="font-size:12px;color:#6b7280">🧑‍💼 ${v.agentName}</div>
            ${hasOrder ? `<div style="font-size:13px;font-weight:700;color:#22c55e;margin-top:6px">Заказ: ${Number(v.orderTotal).toLocaleString("ru-RU")} сум</div>` : `<div style="font-size:12px;color:#6b7280;margin-top:4px">Без заказа</div>`}
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">${new Date(v.visitedAt).toLocaleDateString("ru-RU")}</div>
          </div>`,
          { className: "delis-popup" },
        );
      });

      if (coords.length > 1) {
        L.polyline(coords, { color: "#8b5cf6", weight: 2, opacity: 0.5, dashArray: "8 8" }).addTo(map);
      }

      if (coords.length > 0) {
        map.fitBounds(L.latLngBounds(coords).pad(0.3));
      }
    };

    void init();
    return () => { cancelled = true; };
  }, [visits]);

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: "100%",
        borderRadius: 20,
        overflow: "hidden",
        background: "var(--bg)",
      }}
    />
  );
}
