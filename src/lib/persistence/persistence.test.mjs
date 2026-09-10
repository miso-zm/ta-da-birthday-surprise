import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import { deriveToken, hashSecret } from "./crypto.ts";
import { PersistenceError } from "./errors.ts";
import { PublicationService } from "./service.ts";
import { validateGiftUrl } from "./validation.ts";

const secret = "test-secret-that-is-longer-than-thirty-two-characters";

function operationKey(label) {
  return createHash("sha256").update(label).digest("base64url");
}

function config(dataDir) {
  return {
    appOrigin: "http://127.0.0.1:3100",
    dataDir,
    shareTokenPepper: `${secret}-share`,
    mediaSigningSecret: `${secret}-media`,
  };
}

function cardContent(overrides = {}) {
  return {
    recipient: { displayName: "Mia" },
    sender: { displayName: "Sunny" },
    birthday: "0828",
    opening: { templateId: "warm-letter", title: "Mia，生日快乐！", prompt: "Sunny 留了一份生日惊喜。" },
    unlock: { kind: "none" },
    memory: {
      kind: "card",
      card: { templateId: "coral-birthday", message: "愿新的一岁仍然有很多开心时刻。", signature: "Sunny" },
    },
    gift: { kind: "none", title: "", description: "", externalUrl: "" },
    share: { title: "Mia 的生日惊喜", text: "Sunny 准备了一份生日惊喜。" },
    ...overrides,
  };
}

async function withService(fn) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "tada-persistence-test-"));
  let now = new Date("2026-09-11T00:00:00.000Z");
  const service = new PublicationService(config(dataDir), () => now);
  try {
    await fn({ service, dataDir, setNow: (value) => { now = new Date(value); } });
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
}

test("publishes an immutable idempotent snapshot without storing the public token", async () => {
  await withService(async ({ service, dataDir }) => {
    const first = await service.publish(cardContent(), operationKey("first"));
    const second = await service.publish(cardContent(), operationKey("first"), first.managerToken);
    assert.equal(second.shareUrl, first.shareUrl);
    assert.equal(second.publicationId, first.publicationId);

    const publicToken = new URL(first.shareUrl).pathname.split("/").pop();
    const loaded = await service.load(publicToken);
    assert.equal(loaded.status, "active");
    assert.equal(loaded.surprise.memory.kind, "card");

    const stored = await readFile(path.join(dataDir, "records", `${first.publicationId}.json`), "utf8");
    assert.equal(stored.includes(publicToken), false);
    assert.equal(JSON.parse(stored).publicTokenHash, hashSecret(publicToken, service.config.shareTokenPepper));
  });
});

test("rejects idempotency reuse with changed content", async () => {
  await withService(async ({ service }) => {
    const first = await service.publish(cardContent(), operationKey("conflict"));
    await assert.rejects(
      service.publish(cardContent({ birthday: "0901" }), operationKey("conflict"), first.managerToken),
      (error) => error instanceof PersistenceError && error.code === "conflict",
    );
  });
});

test("an idempotent retry repairs a publication whose final public index write was interrupted", async () => {
  await withService(async ({ service, dataDir }) => {
    const first = await service.publish(cardContent(), operationKey("repair"));
    const publicToken = new URL(first.shareUrl).pathname.split("/").pop();
    const tokenHash = hashSecret(publicToken, service.config.shareTokenPepper);
    await unlink(path.join(dataDir, "public", `${tokenHash}.json`));
    assert.equal((await service.load(publicToken)).status, "not-found");
    const retried = await service.publish(cardContent(), operationKey("repair"), first.managerToken);
    assert.equal(retried.shareUrl, first.shareUrl);
    assert.equal((await service.load(publicToken)).status, "active");
  });
});

test("separates management authorization and makes revoked or expired content unreadable", async () => {
  await withService(async ({ service, setNow }) => {
    const published = await service.publish(cardContent(), operationKey("revoke"));
    const token = new URL(published.shareUrl).pathname.split("/").pop();
    await assert.rejects(
      service.revoke(published.publicationId, deriveToken(secret, "wrong")),
      (error) => error instanceof PersistenceError && error.code === "forbidden",
    );
    assert.equal((await service.load(token)).status, "active");
    await service.revoke(published.publicationId, published.managerToken);
    assert.equal((await service.load(token)).status, "closed");

    const expiring = await service.publish(cardContent(), operationKey("expire"));
    const expiringToken = new URL(expiring.shareUrl).pathname.split("/").pop();
    setNow("2027-09-12T00:00:01.000Z");
    assert.equal((await service.load(expiringToken)).status, "closed");
  });
});

test("sanitizes private scrapbook photos and enforces signed media expiry", async () => {
  await withService(async ({ service, dataDir, setNow }) => {
    const source = await sharp({
      create: { width: 80, height: 60, channels: 3, background: "#fa907b" },
    }).withMetadata({ exif: { IFD0: { Artist: "private metadata" } } }).jpeg().toBuffer();
    const imageUrl = `data:image/jpeg;base64,${source.toString("base64")}`;
    const content = cardContent({
      memory: {
        kind: "scrapbook",
        scrapbook: {
          templateId: "one-photo",
          description: "一起收藏这一天",
          slots: [{ id: "memory-1", imageUrl, transform: { x: 0.5, y: -0.25, scale: 1.8 } }],
        },
      },
    });
    const published = await service.publish(content, operationKey("photo"));
    const token = new URL(published.shareUrl).pathname.split("/").pop();
    const loaded = await service.load(token);
    assert.equal(loaded.status, "active");
    const signedUrl = loaded.surprise.memory.scrapbook.slots[0].imageUrl;
    const parsed = new URL(signedUrl);
    const mediaId = parsed.pathname.split("/").pop();
    const media = await service.media(mediaId, parsed.searchParams.get("expires"), parsed.searchParams.get("signature"));
    const metadata = await sharp(media.bytes).metadata();
    assert.equal(metadata.exif, undefined);
    assert.deepEqual(loaded.surprise.memory.scrapbook.slots[0].transform, { x: 0.5, y: -0.25, scale: 1.8 });
    assert.equal((await readdir(path.join(dataDir, "blobs"))).length, 1);

    setNow("2026-09-11T00:11:00.000Z");
    await assert.rejects(
      service.media(mediaId, parsed.searchParams.get("expires"), parsed.searchParams.get("signature")),
      (error) => error instanceof PersistenceError && error.code === "forbidden",
    );
  });
});

test("rejects invalid, credentialed, and private-network gift URLs", () => {
  assert.throws(() => validateGiftUrl("http://gift.example.com"));
  assert.throws(() => validateGiftUrl("https://user:pass@gift.example.com/redeem"));
  assert.throws(() => validateGiftUrl("https://127.0.0.1/redeem"));
  assert.throws(() => validateGiftUrl("https://192.168.1.2/redeem"));
  assert.throws(() => validateGiftUrl("https://[::1]/redeem"));
  for (const address of [
    "::ffff:127.0.0.1",
    "::ffff:10.20.30.40",
    "::ffff:172.16.0.1",
    "::ffff:172.31.255.255",
    "::ffff:192.168.1.2",
    "::ffff:100.64.0.1",
    "::ffff:169.254.1.2",
    "::ffff:224.0.0.1",
  ]) {
    assert.throws(() => validateGiftUrl(`https://[${address}]/redeem`), address);
  }
  assert.equal(validateGiftUrl("https://[::ffff:8.8.8.8]/redeem"), "https://[::ffff:808:808]/redeem");
  assert.equal(validateGiftUrl("https://gift.example.com/redeem?id=1"), "https://gift.example.com/redeem?id=1");
});

test("a failed photo validation never exposes a public index", async () => {
  await withService(async ({ service, dataDir }) => {
    const content = cardContent({
      memory: {
        kind: "scrapbook",
        scrapbook: {
          templateId: "one-photo",
          description: "",
          slots: [{ id: "memory-1", imageUrl: "data:image/jpeg;base64,bm90LWEtcGhvdG8=", transform: { x: 0, y: 0, scale: 1 } }],
        },
      },
    });
    await assert.rejects(service.publish(content, operationKey("bad-photo")));
    await assert.rejects(readdir(path.join(dataDir, "public")), (error) => error.code === "ENOENT");
  });
});

test("round-trips every unlock, both card templates, both gift branches, and all scrapbook counts", async () => {
  await withService(async ({ service }) => {
    const unlocks = [
      { kind: "none" },
      { kind: "rps" },
      { kind: "blow-candles" },
      { kind: "find-gift", sceneId: "cozy-room", targetId: "plant-box" },
    ];
    for (const [index, unlock] of unlocks.entries()) {
      const gift = index % 2
        ? { kind: "link", title: "", description: "", externalUrl: "https://gift.example.com/redeem" }
        : { kind: "none", title: "", description: "", externalUrl: "" };
      const candidate = cardContent({
        unlock,
        gift,
        memory: {
          kind: "card",
          card: {
            templateId: index % 2 ? "cream-wishes" : "coral-birthday",
            message: "愿你新的一岁仍然有很多开心时刻。",
            signature: "Sunny",
          },
        },
      });
      const published = await service.publish(candidate, operationKey(`unlock-${index}`));
      const loaded = await service.load(new URL(published.shareUrl).pathname.split("/").pop());
      assert.equal(loaded.status, "active");
      assert.deepEqual(loaded.surprise.unlock, unlock);
      assert.equal(loaded.surprise.memory.card.templateId, candidate.memory.card.templateId);
      assert.equal(loaded.surprise.gift.kind, gift.kind);
    }

    const photo = await sharp({
      create: { width: 30, height: 40, channels: 3, background: "#f8f4ee" },
    }).png().toBuffer();
    const imageUrl = `data:image/png;base64,${photo.toString("base64")}`;
    for (const [templateId, count] of [["one-photo", 1], ["two-photo", 2], ["three-photo", 3]]) {
      const candidate = cardContent({
        memory: {
          kind: "scrapbook",
          scrapbook: {
            templateId,
            description: `${count} 张回忆`,
            slots: Array.from({ length: count }, (_, index) => ({
              id: `memory-${index + 1}`,
              imageUrl,
              transform: { x: index / Math.max(count, 1), y: -0.25, scale: 1 + index * 0.25 },
            })),
          },
        },
      });
      const published = await service.publish(candidate, operationKey(`scrapbook-${count}`));
      const loaded = await service.load(new URL(published.shareUrl).pathname.split("/").pop());
      assert.equal(loaded.status, "active");
      assert.equal(loaded.surprise.memory.scrapbook.slots.length, count);
      assert.deepEqual(
        loaded.surprise.memory.scrapbook.slots.map((slot) => slot.transform),
        candidate.memory.scrapbook.slots.map((slot) => slot.transform),
      );
    }

    assert.equal((await service.load("A".repeat(43))).status, "not-found");
    assert.equal(await service.getManaged("0".repeat(32), undefined), null);
  });
});
