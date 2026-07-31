"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, KeyRound, Trash2, ShieldCheck } from "lucide-react";
import { Card, Badge, Avatar, Modal, PageHeader } from "@/shared/ui/kit";
import { ROLE_LABEL, dt } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { useT } from "@/shared/i18n/useT";

export interface UserLite {
  id: number;
  name: string;
  login: string;
  email: string;
  role: string;
  twoFa: boolean;
  lastIp: string;
  device: string;
  lastLoginAt: string;
}

const ROLES = Object.keys(ROLE_LABEL);
const ROLE_COLOR: Record<string, string> = {
  owner: "#f59e0b",
  admin: "#8b5cf6",
  manager: "#3b82f6",
  warehouse: "#14b8a6",
  agent: "#22c55e",
  support: "#ec4899",
  moderator: "#0ea5e9",
  operator: "#a855f7",
};

const PERMS = ["Дашборд", "Заказы", "Товары", "Склад", "Клиенты", "Чат", "Финансы", "Аналитика", "Пользователи", "Настройки"];
const MATRIX: Record<string, number[]> = {
  owner: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  admin: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  manager: [1, 1, 1, 1, 1, 1, 0, 1, 0, 0],
  warehouse: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  agent: [1, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  support: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0],
  moderator: [1, 0, 1, 0, 1, 1, 0, 1, 0, 0],
  operator: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0],
};

export function UsersClient({ users, currentRole, audit }: { users: UserLite[]; currentRole: string; audit: { id: number; actor: string; action: string; entity: string; createdAt: string }[] }) {
  const canManage = currentRole === "owner" || currentRole === "admin";
  const [invite, setInvite] = useState(false);
  const [pwFor, setPwFor] = useState<UserLite | null>(null);
  const [form, setForm] = useState({ name: "", login: "", email: "", role: "manager", password: "" });
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [matrix, setMatrix] = useState(MATRIX);
  const toast = useToast();
  const tr = useT();
  const router = useRouter();

  const inviteUser = async () => {
    setBusy(true);
    try {
      await postManage("createUser", form);
      toast(`Аккаунт @${form.login} создан — сотрудник может войти`);
      setInvite(false);
      setForm({ name: "", login: "", email: "", role: "manager", password: "" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const resetPw = async () => {
    if (!pwFor) return;
    setBusy(true);
    try {
      await postManage("resetPassword", { id: pwFor.id, password: pw });
      toast(`Пароль ${pwFor.name} обновлён`);
      setPwFor(null);
      setPw("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const act = async (action: string, data: Record<string, unknown>, msg: string) => {
    try {
      await postManage(action, data);
      toast(msg);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
  };

  return (
    <>
      <PageHeader
        title={tr("users.title")}
        subtitle={tr("users.subtitle")}
        actions={
          canManage ? (
            <button className="btn btn-primary" onClick={() => setInvite(true)}>
              <UserPlus size={15} /> {tr("users.createAccount")}
            </button>
          ) : (
            <Badge color="#f97316">Создание аккаунтов доступно только Owner/Admin</Badge>
          )
        }
      />

      <div className="grid gap-[var(--gap)] xl:grid-cols-3">
        <Card hover={false} className="xl:col-span-2 !p-0">
          <h3 className="font-semibold card-pad pb-2">Сотрудники ({users.length})</h3>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>{tr("users.employees")}</th>
                  <th>{tr("users.role")}</th>
                  <th>2FA</th>
                  <th className="hidden lg:table-cell">{tr("users.device")}</th>
                  <th>{tr("users.lastLogin")}</th>
                  {canManage && <th />}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5 h-[var(--row)]">
                        <Avatar name={u.name} color={ROLE_COLOR[u.role]} size={32} />
                        <div className="min-w-0">
                          <div className="text-[0.85rem] truncate max-w-[180px]">{u.name}</div>
                          <div className="text-xs muted truncate max-w-[180px]">
                            @{u.login || "—"}{u.email ? ` · ${u.email}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                    </td>
                    <td>
                      {canManage ? (
                        <button onClick={() => act("toggle2fa", { id: u.id }, `2FA ${u.twoFa ? "выключена" : "включена"} для ${u.name}`)}>
                          <Badge color={u.twoFa ? "#22c55e" : "#ef4444"}>{u.twoFa ? "Вкл" : "Выкл"}</Badge>
                        </button>
                      ) : (
                        <Badge color={u.twoFa ? "#22c55e" : "#ef4444"}>{u.twoFa ? "Вкл" : "Выкл"}</Badge>
                      )}
                    </td>
                    <td className="muted text-xs hidden lg:table-cell max-w-[160px] truncate">{u.device}</td>
                    <td className="muted whitespace-nowrap text-xs">{dt(u.lastLoginAt)}</td>
                    {canManage && (
                      <td>
                        <div className="flex gap-1">
                          <button className="btn !px-2 !py-1" title="Сменить пароль" onClick={() => setPwFor(u)}>
                            <KeyRound size={13} />
                          </button>
                          {u.role !== "owner" && (
                            <button
                              className="btn !px-2 !py-1"
                              title="Удалить"
                              onClick={() => act("deleteUser", { id: u.id }, `Аккаунт ${u.email} удалён`)}
                            >
                              <Trash2 size={13} color="var(--error)" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck size={16} color="var(--success)" /> Audit Log
          </h3>
          <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto">
            {audit.map((a) => (
              <div key={a.id} className="flex gap-3">
                <Avatar name={a.actor} color="var(--accent)" size={30} />
                <div className="min-w-0">
                  <div className="text-[0.8rem]">
                    <b>{a.actor}</b> <span className="muted">{a.action}</span>
                  </div>
                  <div className="text-xs muted truncate">
                    {a.entity} · {dt(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card hover={false} className="!p-0">
        <h3 className="font-semibold card-pad pb-2">{tr("users.permissionMatrix")}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-[760px]">
            <thead>
              <tr>
                <th>{tr("users.role")}</th>
                {PERMS.map((p) => (
                  <th key={p}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r}>
                  <td>
                    <Badge color={ROLE_COLOR[r]}>{ROLE_LABEL[r]}</Badge>
                  </td>
                  {matrix[r].map((v, i) => (
                    <td key={i}>
                      <button
                        onClick={() => {
                          if (!canManage) {
                            toast("Изменение прав доступно только Owner/Admin", "err");
                            return;
                          }
                          setMatrix((m) => ({ ...m, [r]: m[r].map((x, j) => (j === i ? (x ? 0 : 1) : x)) }));
                          toast(`Право «${PERMS[i]}» для ${ROLE_LABEL[r]} ${v ? "отключено" : "включено"}`);
                        }}
                        className="inline-block w-9 h-5 rounded-full relative"
                        style={{ background: v ? "linear-gradient(120deg,var(--primary),var(--accent))" : "rgba(var(--border))" }}
                      >
                        <motion.span layout className="absolute top-0.5 w-4 h-4 rounded-full bg-white" animate={{ left: v ? 18 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {invite && (
          <Modal open onClose={() => setInvite(false)} title="Новый аккаунт сотрудника">
            <div className="flex flex-col gap-3.5">
              <input className="input" placeholder="Имя и фамилия" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 muted text-sm">@</span>
                <input className="input !pl-9" placeholder="Логин для входа (например: aziza)" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
              </div>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.filter((r) => r !== "owner").map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <input className="input" type="password" placeholder="Пароль (мин. 4 символа)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <input className="input" placeholder="Email (необязательно)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <button className="btn btn-primary justify-center" disabled={busy} onClick={inviteUser}>
                {busy ? "Создаём…" : "Создать аккаунт"}
              </button>
              <p className="text-xs muted text-center">Сотрудник войдёт по этому логину и паролю. Сменить пароль может только Owner/Admin.</p>
            </div>
          </Modal>
        )}
        {pwFor && (
          <Modal open onClose={() => setPwFor(null)} title={`Новый пароль: ${pwFor.name}`}>
            <div className="flex flex-col gap-3.5">
              <input className="input" type="password" placeholder="Новый пароль" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button className="btn btn-primary justify-center" disabled={busy} onClick={resetPw}>
                {busy ? "Сохраняем…" : "Сменить пароль"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
