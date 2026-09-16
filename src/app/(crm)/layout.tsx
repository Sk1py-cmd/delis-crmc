import { Sidebar } from "@/widgets/Sidebar";
import { Topbar } from "@/widgets/Topbar";
import { PageTransition } from "@/shared/ui/PageTransition";
import { getSessionUser } from "@/server/auth";
import { canAccess } from "@/shared/config/nav";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // Вложенные server components могут начать загрузку параллельно с layout.
  // Поэтому нельзя просто отрисовать форму входа здесь: их RSC-payload с
  // данными попадёт в HTML. Redirect полностью обрывает неавторизованный ответ.
  if (!user) redirect("/login");

  // Единая проверка прав на все разделы CRM. Точечный requireAccess стоял
  // лишь на 4 страницах из 24: остальные прятались из меню, но открывались
  // по прямой ссылке (склад заходил в /instagram, поддержка в /warehouse).
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const [, first] = pathname.split("/");
  const section = first ? `/${first}` : "/";

  if (!canAccess(user.role, section)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-3 md:p-4 pb-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
