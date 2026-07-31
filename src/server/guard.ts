import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import { canAccess } from "@/shared/config/nav";

/** Серверная защита страницы: редирект на дашборд, если роль не имеет доступа */
export async function requireAccess(href: string) {
  const user = await getSessionUser();
  if (!user) return null;
  if (!canAccess(user.role, href)) {
    redirect("/");
  }
  return user;
}
