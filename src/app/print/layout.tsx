import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { canAccess } from "@/shared/config/nav";

export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  // Печатные формы — это счета, накладные и акты сверки: суммы, долг и
  // контакты клиента. Раньше проверялся только вход, поэтому кладовщик
  // открывал акт сверки по прямой ссылке, хотя раздел заказов ему закрыт.
  if (!canAccess(user.role, "/orders")) redirect("/");

  return (
    <div
      style={{
        background: "#fff",
        color: "#111",
        minHeight: "100vh",
        colorScheme: "light",
      }}
    >
      {children}
    </div>
  );
}
