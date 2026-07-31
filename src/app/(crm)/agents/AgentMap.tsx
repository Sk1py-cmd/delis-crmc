"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Badge } from "@/shared/ui/kit";
import { money, dt } from "@/shared/lib/format";

export interface VisitMarker {
  id: number;
  agentId: number;
  agentName: string;
  storeName: string;
  storeAddress: string;
  gpsCoords: string;
  status: string;
  orderTotal: string;
  notes: string;
  photos: string[];
  visitedAt: string;
}

function parseCoords(gps: string): [number, number] | null {
  if (!gps) return null;
  const parts = gps.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]];
  return null;
}

const COLORS: Record<string, string> = {
  order_placed: "#22c55e",
  completed: "#3b82f6",
  no_order: "#f97316",
};

export function AgentMap({ visits, height = 400 }: { visits: VisitMarker[]; height?: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    let cancelled = false;

    const init = async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;

      const coords = visits.map((v) => ({ v, c: parseCoords(v.gpsCoords) })).filter((x) => x.c) as { v: VisitMarker; c: [number, number] }[];
      const allCoords = coords.map((x) => x.c);
      const center: [number, number] = allCoords.length > 0 ? allCoords[0] : [41.2995, 69.2401];

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(center, 12);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; CARTO',
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      coords.forEach(({ v, c }) => {
        const color = COLORS[v.status] ?? "#8b5cf6";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 4px 14px ${color}88;display:grid;place-items:center"><span style="font-size:13px">📍</span></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30],
        });

        const marker = L.marker(c, { icon }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif;min-width:200px">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px">${v.storeName}</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">📍 ${v.storeAddress}</div>
            <div style="font-size:12px;color:#6b7280">🧑‍💼 ${v.agentName}</div>
            ${v.notes ? `<div style="font-size:11px;color:#9ca3af;margin-top:6px;line-height:1.5">${v.notes}</div>` : ""}
            ${v.photos.length > 0 ? `<div style="font-size:11px;color:#8b5cf6;margin-top:4px">📸 ${v.photos.length} фото</div>` : ""}
            <div style="display:flex;justify-content:space-between;margin-top:8px">
              <span style="font-size:11px;color:#9ca3af">${dt(v.visitedAt)}</span>
              ${Number(v.orderTotal) > 0
                ? `<span style="font-size:13px;font-weight:700;color:#22c55e">${money(v.orderTotal)}</span>`
                : `<span style="font-size:11px;color:#6b7280">Без заказа</span>`}
            </div>
          </div>`
        );
      });

      if (allCoords.length > 1) {
        L.polyline(allCoords, { color: "#8b5cf6", weight: 2, opacity: 0.5, dashArray: "8 8" }).addTo(map);
        map.fitBounds(L.latLngBounds(allCoords).pad(0.25), { maxZoom: 14 });
      }
    };

    void init();
    return () => { cancelled = true; };
  }, [visits]);

  return (
    <Card hover={false} className="!p-0 overflow-hidden">
      <div className="card-pad pb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <h3 className="font-semibold">GPS-карта визитов агентов</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge color="#22c55e">С заказом</Badge>
          <Badge color="#3b82f6">Завершён</Badge>
          <Badge color="#f97316">Без заказа</Badge>
        </div>
      </div>
      <div ref={mapRef} style={{ height, background: "#0f172a" }} />
    </Card>
  );
}
