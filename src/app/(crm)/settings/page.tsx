import { getSessionUser } from "@/server/auth";
import { getIntegrations } from "@/server/queries";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, integrations] = await Promise.all([getSessionUser(), getIntegrations()]);
  const tg = integrations.find((i) => i.key === "telegram_bot");
  const creds = tg?.credentials ?? {};

  return (
    <SettingsClient
      user={{
        name: user?.name ?? "Пользователь",
        login: user?.login ?? "",
        email: user?.email ?? "",
        role: user?.role ?? "manager",
      }}
      telegram={{
        enabled: Boolean(tg?.enabled && creds.ownerChatId),
        tokenSet: Boolean(creds.token),
        chatId: creds.ownerChatId ?? "",
      }}
    />
  );
}
