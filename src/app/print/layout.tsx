import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/");

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
