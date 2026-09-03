"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Экран непредвиденной ошибки.
 *
 * Заменяет стандартный «Something went wrong» Next.js: при недоступной БД
 * (самый частый случай) пользователь видел белую страницу без объяснений и
 * без способа повторить попытку.
 *
 * Причину наружу не показываем — в message drizzle кладёт текст SQL-запроса
 * вместе со значениями параметров. Для поддержки выводим только digest,
 * по которому запись находится в логах сервера.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Необработанная ошибка страницы:", error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="glass card-pad w-full max-w-md !p-8 text-center">
        <div
          className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
          style={{
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            boxShadow: "0 14px 34px -14px #ef4444",
          }}
        >
          <AlertTriangle size={26} color="#fff" />
        </div>

        <h1 className="text-lg font-semibold mb-2">Что-то пошло не так</h1>
        <p className="text-sm opacity-70 mb-6">
          Раздел временно недоступен. Обычно это связано с потерей связи с базой
          данных — повторите попытку через несколько секунд.
        </p>

        <button className="btn btn-primary w-full justify-center" onClick={reset}>
          <RotateCw size={15} /> Повторить
        </button>

        {error.digest && (
          <p className="text-[0.72rem] opacity-50 mt-4">
            Код для поддержки: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
