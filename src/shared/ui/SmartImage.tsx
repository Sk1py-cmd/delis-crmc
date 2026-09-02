"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Обёртка над next/image для пользовательского контента.
 *
 * Оптимизатор Next не умеет работать с `data:` и `blob:` URL, а внешние
 * домены требуют записи в `images.remotePatterns`. Такие источники
 * отдаём обычным `<img>`, остальные — через next/image, получая
 * ленивую загрузку и автоматическое изменение размера.
 */

const isUnoptimizable = (src: string) =>
  src.startsWith("data:") || src.startsWith("blob:");

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Растянуть по родителю (родителю нужен position: relative). */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  onClick?: () => void;
  onError?: () => void;
}

export function SmartImage({
  src,
  alt,
  className,
  style,
  fill,
  width,
  height,
  sizes,
  priority,
  onClick,
  onError,
}: SmartImageProps) {
  if (!src) return null;

  if (isUnoptimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data:/blob: не проходят через оптимизатор
      <img
        src={src}
        alt={alt}
        className={className}
        style={fill ? { ...style, width: "100%", height: "100%" } : style}
        onClick={onClick}
        onError={onError}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
        className={className}
        style={style}
        priority={priority}
        onClick={onClick}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 600}
      sizes={sizes}
      className={className}
      style={style}
      priority={priority}
      onClick={onClick}
      onError={onError}
    />
  );
}
