import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NextRequest } from "next/server";

function content() {
  return {
    recipient: { displayName: "Mia" },
    sender: { displayName: "Sunny" },
    birthday: "0828",
    opening: { templateId: "warm-letter", title: "Mia，生日快乐！", prompt: "Sunny 留了一份生日惊喜。" },
    unlock: { kind: "rps" },
    memory: { kind: "card", card: { templateId: "cream-wishes", message: "愿你新的一岁继续做喜欢的事。", signature: "Sunny" } },
    gift: { kind: "link", title: "", description: "", externalUrl: "https://gift.example.com/redeem?id=test" },
    share: { title: "Mia 的生日惊喜", text: "Sunny 准备了一份生日惊喜。" },
  };
}

test("publish and revoke routes keep receiver and manager credentials separate", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "tada-api-test-"));
  process.env.APP_ORIGIN = "http://127.0.0.1:3199";
  process.env.TADA_DATA_DIR = dataDir;
  process.env.SHARE_TOKEN_PEPPER = "api-test-share-secret-abcdefghijklmnopqrstuvwxyz";
  process.env.MEDIA_SIGNING_SECRET = "api-test-media-secret-abcdefghijklmnopqrstuvwxyz";
  try {
    const publishRoute = await import("../../app/api/publish/route.ts");
    const revokeRoute = await import("../../app/api/manage/[publicationId]/revoke/route.ts");
    const request = new Request("http://untrusted-host.example/api/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": createHash("sha256").update("route-operation").digest("base64url"),
      },
      body: JSON.stringify({ content: content() }),
    });
    const published = await publishRoute.POST(request);
    assert.equal(published.status, 201);
    assert.equal(published.headers.get("x-robots-tag"), "noindex, nofollow");
    const body = await published.json();
    assert.match(body.shareUrl, /^http:\/\/127\.0\.0\.1:3199\/s\/[A-Za-z0-9_-]{43}$/);
    assert.equal(body.shareUrl.includes(body.publicationId), false);
    assert.match(body.manageUrl, new RegExp(`/create/manage/${body.publicationId}$`));
    const cookie = published.headers.get("set-cookie");
    assert.match(cookie, /tada_manager=[A-Za-z0-9_-]{43}/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    assert.doesNotMatch(cookie, /Secure/i);

    const cookiePair = cookie.split(";")[0];
    const badOrigin = await revokeRoute.POST(
      new NextRequest(`http://127.0.0.1:3199/api/manage/${body.publicationId}/revoke`, {
        method: "POST",
        headers: { cookie: cookiePair, origin: "https://attacker.example" },
      }),
      { params: Promise.resolve({ publicationId: body.publicationId }) },
    );
    assert.equal(badOrigin.status, 403);

    const revoked = await revokeRoute.POST(
      new NextRequest(`http://127.0.0.1:3199/api/manage/${body.publicationId}/revoke`, {
        method: "POST",
        headers: { cookie: cookiePair, origin: "http://127.0.0.1:3199" },
      }),
      { params: Promise.resolve({ publicationId: body.publicationId }) },
    );
    assert.equal(revoked.status, 200);
    assert.equal((await revoked.json()).status, "revoked");
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
