import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySecurityWorkflowToken } from "@/server/github-oidc";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
Object.assign(jwk, { kid: "test-key", alg: "RS256", use: "sig" });

function token(overrides: Record<string, unknown> = {}) {
  const now = 2_000_000_000;
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "https://token.actions.githubusercontent.com",
    aud: "delis-crm-security",
    exp: now + 300,
    nbf: now - 30,
    repository: "Sk1py-cmd/delis-crmc",
    ref: "refs/heads/main",
    event_name: "schedule",
    workflow_ref: "Sk1py-cmd/delis-crmc/.github/workflows/security-weekly.yml@refs/heads/main",
    ...overrides,
  })).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const fetchJwks = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });

describe("GitHub Actions OIDC", () => {
  it("принимает только weekly workflow из main", async () => {
    await expect(verifySecurityWorkflowToken(token(), { fetch: fetchJwks, now: 2_000_000_000 })).resolves.toMatchObject({
      repository: "Sk1py-cmd/delis-crmc",
      ref: "refs/heads/main",
    });
  });

  it("отклоняет токен другого репозитория", async () => {
    await expect(verifySecurityWorkflowToken(token({ repository: "evil/repo" }), { fetch: fetchJwks, now: 2_000_000_000 })).rejects.toThrow("репозиторий");
  });

  it("отклоняет истёкший токен", async () => {
    await expect(verifySecurityWorkflowToken(token({ exp: 1_999_999_000 }), { fetch: fetchJwks, now: 2_000_000_000 })).rejects.toThrow("истёк");
  });
});
