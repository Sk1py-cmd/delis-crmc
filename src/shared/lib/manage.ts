export async function postManage(action: string, data: Record<string, unknown> = {}) {
  const res = await fetch("/api/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string; count?: number; id?: number };
  if (!res.ok || json.error) throw new Error(json.error ?? "Ошибка запроса");
  return json;
}
