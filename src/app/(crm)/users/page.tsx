import { getUsers, getActivity } from "@/server/queries";
import { getSessionUser } from "@/server/auth";
import { requireAccess } from "@/server/guard";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAccess("/users");
  const [users, activity, session] = await Promise.all([getUsers(), getActivity(), getSessionUser()]);

  return (
    <UsersClient
      currentRole={session?.role ?? "manager"}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        login: u.login,
        email: u.email,
        role: u.role,
        twoFa: u.twoFa,
        lastIp: u.lastIp,
        device: u.device,
        lastLoginAt: String(u.lastLoginAt),
      }))}
      audit={activity.map((a) => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        entity: a.entity,
        createdAt: String(a.createdAt),
      }))}
    />
  );
}
