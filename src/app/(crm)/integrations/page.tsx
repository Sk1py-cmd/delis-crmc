import { getIntegrationsForClient } from "@/server/queries";
import { requireAccess } from "@/server/guard";
import { IntegrationsClient } from "./IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await requireAccess("/integrations");
  const rows = await getIntegrationsForClient();
  return (
    <IntegrationsClient
      integrations={rows.map((i) => ({
        id: i.id, key: i.key, title: i.title, enabled: i.enabled,
        credentials: i.credentials, configuredSecrets: i.configuredSecrets, status: i.status,
        lastCheckAt: i.lastCheckAt ? String(i.lastCheckAt) : null,
      }))}
      role={user?.role ?? "manager"}
    />
  );
}
