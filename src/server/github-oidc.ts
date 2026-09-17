import { createPublicKey, verify, type JsonWebKey as NodeJsonWebKey } from "node:crypto";

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const AUDIENCE = "delis-crm-security";
const REPOSITORY = "Sk1py-cmd/delis-crmc";
const WORKFLOW_REF = `${REPOSITORY}/.github/workflows/security-weekly.yml@refs/heads/main`;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface GitHubClaims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  repository?: string;
  ref?: string;
  event_name?: string;
  workflow_ref?: string;
  [key: string]: JsonValue | undefined;
}

interface SigningJwk extends NodeJsonWebKey {
  kid?: string;
}

interface JwkSet {
  keys?: SigningJwk[];
}

type FetchLike = (input: string) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

function hasAudience(aud: GitHubClaims["aud"]): boolean {
  return typeof aud === "string" ? aud === AUDIENCE : Array.isArray(aud) && aud.includes(AUDIENCE);
}

/**
 * Проверяет GitHub Actions OIDC-токен без общего секрета между GitHub и CRM.
 * Разрешён только наш weekly workflow из main; чужой Action или PR не сможет
 * использовать endpoint как прокси для Telegram.
 */
export async function verifySecurityWorkflowToken(
  token: string,
  options: { fetch?: FetchLike; now?: number } = {},
): Promise<GitHubClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Некорректный JWT");

  const header = decodePart<JwtHeader>(parts[0]);
  const claims = decodePart<GitHubClaims>(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Неподдерживаемая подпись JWT");

  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(JWKS_URL);
  if (!response.ok) throw new Error("GitHub JWKS недоступен");
  const jwks = (await response.json()) as JwkSet;
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Ключ подписи GitHub не найден");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const validSignature = verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    publicKey,
    Buffer.from(parts[2], "base64url"),
  );
  if (!validSignature) throw new Error("Неверная подпись JWT");

  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (claims.iss !== ISSUER) throw new Error("Неверный issuer");
  if (!hasAudience(claims.aud)) throw new Error("Неверная audience");
  if (typeof claims.exp !== "number" || claims.exp < now - 30) throw new Error("JWT истёк");
  if (typeof claims.nbf === "number" && claims.nbf > now + 30) throw new Error("JWT ещё не действует");
  if (claims.repository !== REPOSITORY) throw new Error("Неверный репозиторий");
  if (claims.ref !== "refs/heads/main") throw new Error("Разрешена только ветка main");
  if (claims.workflow_ref !== WORKFLOW_REF) throw new Error("Неверный workflow");
  if (!["schedule", "workflow_dispatch", "push"].includes(claims.event_name ?? "")) {
    throw new Error("Неверное событие GitHub Actions");
  }

  return claims;
}
