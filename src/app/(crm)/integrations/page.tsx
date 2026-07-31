import { getIntegrations } from "@/server/queries";
import { getSessionUser } from "@/server/auth";
import { requireAccess } from "@/server/guard";
import { IntegrationsClient } from "./IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireAccess("/integrations");
  const [rows, user] = await Promise.all([getIntegrations(), getSessionUser()]);
  return (
    <IntegrationsClient
      integrations={rows.map((i) => ({
        id: i.id, key: i.key, title: i.title, enabled: i.enabled,
        credentials: i.credentials ?? {}, status: i.status,
        lastCheckAt: i.lastCheckAt ? String(i.lastCheckAt) : null,
      }))}
      role={user?.role ?? "manager"}
    />
  );
}
