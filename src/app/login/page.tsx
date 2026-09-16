import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { LoginScreen } from "./LoginScreen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return <LoginScreen />;
}
