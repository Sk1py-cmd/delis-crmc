import { verifySecurityWorkflowToken } from "@/server/github-oidc";
import { formatSecurityReport, parseSecurityReport } from "@/server/security-report";
import { sendOwnerTelegramMessage } from "@/server/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await verifySecurityWorkflowToken(authorization.slice(7));
  } catch {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > 32_000) {
    return Response.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  try {
    const report = parseSecurityReport(JSON.parse(raw));
    const result = await sendOwnerTelegramMessage(formatSecurityReport(report));
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 503 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Некорректный отчёт";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
