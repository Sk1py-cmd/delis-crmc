"use client";

import { useEffect } from "react";

/**
 * Последний рубеж: ошибки самого корневого layout.
 *
 * `app/error.tsx` их не перехватывает — он живёт внутри layout, который к
 * этому моменту уже не отрисовался. Поэтому здесь свои <html> и <body>, а
 * стили заданы инлайном: провайдеры темы и globals.css могли не подняться.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Критическая ошибка приложения:", error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b0b12",
          color: "#e8e8f0",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.1rem", margin: "0 0 .6rem" }}>
            Приложение недоступно
          </h1>
          <p style={{ fontSize: ".88rem", opacity: 0.7, margin: "0 0 1.4rem", lineHeight: 1.5 }}>
            Сервис не смог запуститься. Проверьте подключение к базе данных и
            повторите попытку.
          </p>
          <button
            onClick={reset}
            style={{
              padding: ".6rem 1.4rem",
              borderRadius: ".75rem",
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,#8b5cf6,#6366f1)",
              color: "#fff",
              fontSize: ".88rem",
              fontWeight: 600,
            }}
          >
            Повторить
          </button>
          {error.digest && (
            <p style={{ fontSize: ".72rem", opacity: 0.45, marginTop: "1rem" }}>
              Код для поддержки: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
