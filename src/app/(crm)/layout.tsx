import { Sidebar } from "@/widgets/Sidebar";
import { Topbar } from "@/widgets/Topbar";
import { PageTransition } from "@/shared/ui/PageTransition";
import { getSessionUser } from "@/server/auth";
import { LoginScreen } from "@/app/login/LoginScreen";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) return <LoginScreen />;

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
