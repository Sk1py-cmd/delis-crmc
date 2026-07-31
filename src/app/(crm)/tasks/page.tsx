import { getTasks, getUsers } from "@/server/queries";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, users] = await Promise.all([getTasks(), getUsers()]);
  return (
    <TasksClient
      tasks={tasks.map((t) => ({
        id: t.id, title: t.title, description: t.description, assignee: t.assignee,
        priority: t.priority, status: t.status, linkType: t.linkType, linkLabel: t.linkLabel,
        dueAt: t.dueAt ? String(t.dueAt) : null, createdBy: t.createdBy, createdAt: String(t.createdAt),
      }))}
      team={users.map((u) => u.name)}
    />
  );
}
