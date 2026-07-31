"use client";

import { useState } from "react";

const isUrl = (v: string) => /^https?:\/\//.test(v) || v.startsWith("data:image");

export function ProductThumb({
  src,
  name,
  size = 64,
  radius = 18,
  className,
}: {
  src: string;
  name?: string;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && isUrl(src) && !failed;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.45,
        background: showImage
          ? "rgba(var(--table-row))"
          : "linear-gradient(140deg, color-mix(in srgb, var(--primary) 24%, transparent), transparent)",
        border: "1px solid rgba(var(--border))",
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? "Товар"}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span>{src && !isUrl(src) ? src : "🧴"}</span>
      )}
    </div>
  );
}

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);
  if (list.length === 0) return <ProductThumb src="" name={name} size={200} radius={24} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ProductThumb src={list[active]} name={name} size={220} radius={24} />
      {list.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: 0,
                border: i === active ? "2px solid var(--primary)" : "2px solid transparent",
                borderRadius: 14,
                background: "none",
                cursor: "pointer",
                lineHeight: 0,
              }}
            >
              <ProductThumb src={img} name={name} size={54} radius={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
