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
    gift: { kind: "link", title: "", description: "", externalUrl: "https://3.cn/-SafeGift123" },
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
    const deleteRoute = await import("../../app/api/manage/[publicationId]/delete/route.ts");
    for (const origin of [undefined, "https://attacker.example"]) {
      const rejected = await publishRoute.POST(new Request("http://127.0.0.1:3199/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
        body: "{}",
      }));
      assert.equal(rejected.status, 403);
    }
    const wrongFormat = await publishRoute.POST(new Request("http://127.0.0.1:3199/api/publish", {
      method: "POST", headers: { origin: "http://127.0.0.1:3199", "content-type": "text/plain" }, body: "{}",
    }));
    assert.equal(wrongFormat.status, 400);
    const missingConsent = await publishRoute.POST(new Request("http://127.0.0.1:3199/api/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:3199",
        "idempotency-key": createHash("sha256").update("missing-consent").digest("base64url"),
      },
      body: JSON.stringify({ content: content() }),
    }));
    assert.equal(missingConsent.status, 400);
    const request = new Request("http://untrusted-host.example/api/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:3199",
        "idempotency-key": createHash("sha256").update("route-operation").digest("base64url"),
      },
      body: JSON.stringify({ content: content(), consent: { termsAccepted: true } }),
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
    const listRoute = await import("../../app/api/manage/list/route.ts");
    async function list(ids, cookieValue = cookiePair, originValue = "http://127.0.0.1:3199") {
      return listRoute.POST(new Request("http://127.0.0.1:3199/api/manage/list", {
        method: "POST", headers: { cookie: cookieValue, origin: originValue, "content-type": "application/json" }, body: JSON.stringify({ ids }),
      }));
    }
    const listed = await list([body.publicationId, body.publicationId, "0".repeat(32)]);
    assert.equal(listed.status, 200);
    const listBody = await listed.json();
    assert.equal(listBody.works.length, 1);
    assert.equal(listBody.works[0].status, "active");
    assert.equal(JSON.stringify(listBody).includes("managerToken"), false);
    assert.deepEqual((await (await list([body.publicationId], "")).json()).works, []);
    assert.equal((await list([body.publicationId], cookiePair, "https://attacker.example")).status, 403);
    assert.equal((await list(["../records"])).status, 400);
    assert.equal((await list(Array(101).fill(body.publicationId))).status, 400);
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
    assert.equal((await (await list([body.publicationId])).json()).works[0].status, "revoked");

    const deleted = await deleteRoute.POST(
      new NextRequest(`http://127.0.0.1:3199/api/manage/${body.publicationId}/delete`, {
        method: "POST",
        headers: { cookie: cookiePair, origin: "http://127.0.0.1:3199" },
      }),
      { params: Promise.resolve({ publicationId: body.publicationId }) },
    );
    assert.equal(deleted.status, 200);
    assert.equal((await deleted.json()).status, "deleted");
    assert.equal((await (await list([body.publicationId])).json()).works[0].status, "deleted");
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
