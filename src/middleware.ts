import { NextRequest, NextResponse } from "next/server";

/**
 * Пробрасывает текущий путь в заголовок, чтобы layout мог проверить права.
 *
 * Сама проверка намеренно живёт в layout, а не здесь: middleware работает
 * на edge-рантайме и не может обратиться к БД, поэтому роль пришлось бы
 * брать из cookie — а её клиент подделает. Layout же читает роль из сессии
 * в базе.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Только страницы: API проверяет права сам, статика и загрузки не нужны.
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon.ico|manifest.webmanifest|sw.js|icons).*)"],
};
