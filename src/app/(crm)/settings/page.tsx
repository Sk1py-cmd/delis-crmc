import { getIntegrations, telegramBotConfigured } from "@/server/queries";
import { pushConfigured, vapidPublicKey } from "@/server/webpush";
import { SettingsClient } from "./SettingsClient";
import { requireAccess } from "@/server/guard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAccess("/settings");
  const integrations = await getIntegrations();
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
        serverConfigured: telegramBotConfigured(),
        chatId: creds.ownerChatId ?? "",
      }}
      push={{
        enabled: pushConfigured(),
        publicKey: vapidPublicKey(),
      }}
    />
  );
}
