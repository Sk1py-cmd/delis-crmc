import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { canAccess } from "@/shared/config/nav";

/**
 * Проверка прав для REST-маршрутов.
 *
 * Раньше роуты проверяли только факт входа (`if (!auth) 401`), но не роль.
 * Страницы при этом были закрыты через layout, и получалась дыра: раздел
 * не виден в меню и не открывается по ссылке, а тот же самый набор действий
 * спокойно выполняется запросом к API. Проверено на живом стенде — агент
 * удалял товары, поддержка списывала остатки со склада.
 *
 * `/api/manage` эту проблему уже решал своей таблицей ACTION_POLICY;
 * здесь тот же подход для остальных маршрутов, с опорой на общий
 * `canAccess`, чтобы права API и меню не разъезжались.
 *
 * Использование:
 *
 *   const guard = await requireApiAccess("/products");
 *   if (!guard.ok) return guard.response;
 *   guard.user // SessionUser
 */
export type ApiGuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireApiAccess(section: string): Promise<ApiGuardResult> {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Требуется авторизация" }, { status: 401 }),
    };
  }

  if (!canAccess(user.role, section)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Недостаточно прав для этого действия" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

/** Только вход, без привязки к разделу (например, глобальный поиск). */
export async function requireApiAuth(): Promise<ApiGuardResult> {
  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Требуется авторизация" }, { status: 401 }),
    };
  }

  return { ok: true, user };
}
