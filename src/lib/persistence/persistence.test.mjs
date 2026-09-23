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

async function scrapbookContent(overrides = {}) {
  const source = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#fa907b" },
  }).png().toBuffer();
  const imageUrl = `data:image/png;base64,${source.toString("base64")}`;
  return cardContent({
    memory: {
      kind: "scrapbook",
      scrapbook: {
        templateId: "one-photo",
        description: "虚构测试照片",
        slots: [{ id: "memory-1", imageUrl, transform: { x: 0, y: 0, scale: 1 } }],
      },
    },
    ...overrides,
  });
}

async function interruptDelete(service, published, matchesPath) {
  const remove = service.store.remove.bind(service.store);
  let injected = false;
  service.store.remove = async (relativePath) => {
    if (!injected && matchesPath(relativePath)) {
      injected = true;
      throw new Error("Injected cleanup failure");
    }
    return remove(relativePath);
  };
  try {
    await assert.rejects(
      service.deletePublication(published.publicationId, published.managerToken),
      /Injected cleanup failure/,
    );
    assert.equal(injected, true);
  } finally {
    service.store.remove = remove;
  }
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

test("stores only the final portrait poster and returns a signed receiver image", async () => {
  await withService(async ({ service, dataDir }) => {
    const source = await sharp({
      create: { width: 720, height: 720, channels: 4, background: { r: 168, g: 216, b: 255, alpha: 0.8 } },
    }).withMetadata({ exif: { IFD0: { Artist: "must be removed" } } }).png().toBuffer();
    const imageUrl = `data:image/png;base64,${source.toString("base64")}`;
    const published = await service.publish(cardContent({
      portrait: { templateId: "blue", imageUrl },
    }), operationKey("portrait-poster"));
    const token = new URL(published.shareUrl).pathname.split("/").pop();
    const loaded = await service.load(token);
    assert.equal(loaded.status, "active");
    assert.equal(loaded.surprise.portrait.templateId, "blue");
    assert.match(loaded.surprise.portrait.imageUrl, /\/api\/media\//);
    const parsed = new URL(loaded.surprise.portrait.imageUrl);
    const mediaId = parsed.pathname.split("/").pop();
    const media = await service.media(mediaId, parsed.searchParams.get("expires"), parsed.searchParams.get("signature"));
    const metadata = await sharp(media.bytes).metadata();
    assert.equal(metadata.width, 720);
    assert.equal(metadata.height, 720);
    assert.equal(metadata.hasAlpha, true);
    assert.equal(metadata.exif, undefined);
    assert.equal((await readdir(path.join(dataDir, "blobs"))).length, 1);
    const stored = await readFile(path.join(dataDir, "records", `${published.publicationId}.json`), "utf8");
    assert.equal(stored.includes("data:image"), false);
    assert.equal(stored.includes("stickerImageUrl"), false);
  });
});

test("refreshes expired scrapbook and portrait signatures only while the publication remains active", async () => {
  await withService(async ({ service, setNow }) => {
    const portraitSource = await sharp({
      create: { width: 120, height: 120, channels: 4, background: { r: 90, g: 130, b: 220, alpha: 1 } },
    }).png().toBuffer();
    const published = await service.publish(await scrapbookContent({
      portrait: { templateId: "blue", imageUrl: `data:image/png;base64,${portraitSource.toString("base64")}` },
    }), operationKey("refresh-expired-media"));
    const token = new URL(published.shareUrl).pathname.split("/").pop();
    const initial = await service.load(token);
    assert.equal(initial.status, "active");
    const originalUrls = [
      initial.surprise.memory.scrapbook.slots[0].imageUrl,
      initial.surprise.portrait.imageUrl,
    ];

    setNow("2026-09-11T00:11:00.000Z");
    for (const url of originalUrls) {
      const parsed = new URL(url);
      await assert.rejects(
        service.media(parsed.pathname.split("/").pop(), parsed.searchParams.get("expires"), parsed.searchParams.get("signature")),
        (error) => error instanceof PersistenceError && error.code === "forbidden",
      );
    }

    const refreshed = await service.refreshMedia(token);
    assert.equal(refreshed.status, "active");
    const renewedUrls = [
      refreshed.surprise.memory.scrapbook.slots[0].imageUrl,
      refreshed.surprise.portrait.imageUrl,
    ];
    assert.notDeepEqual(renewedUrls, originalUrls);
    for (const url of renewedUrls) {
      const parsed = new URL(url);
      const media = await service.media(parsed.pathname.split("/").pop(), parsed.searchParams.get("expires"), parsed.searchParams.get("signature"));
      assert.ok(media.bytes.length > 0);
    }

    await service.revoke(published.publicationId, published.managerToken);
    assert.equal((await service.refreshMedia(token)).status, "closed");
    await service.deletePublication(published.publicationId, published.managerToken);
    assert.equal((await service.refreshMedia(token)).status, "not-found");

    const expiring = await service.publish(await scrapbookContent(), operationKey("refresh-expired-publication"));
    const expiringToken = new URL(expiring.shareUrl).pathname.split("/").pop();
    setNow("2027-09-12T00:12:00.000Z");
    assert.equal((await service.refreshMedia(expiringToken)).status, "closed");
    assert.equal((await service.refreshMedia(deriveToken(secret, "wrong-public-token"))).status, "not-found");
  });
});

test("media refresh refuses a stored media reference owned by another publication", async () => {
  await withService(async ({ service, dataDir }) => {
    const first = await service.publish(await scrapbookContent(), operationKey("refresh-owner-a"));
    const second = await service.publish(await scrapbookContent(), operationKey("refresh-owner-b"));
    const firstRecordPath = path.join(dataDir, "records", `${first.publicationId}.json`);
    const secondRecordPath = path.join(dataDir, "records", `${second.publicationId}.json`);
    const firstRecord = JSON.parse(await readFile(firstRecordPath, "utf8"));
    const secondRecord = JSON.parse(await readFile(secondRecordPath, "utf8"));
    firstRecord.content.memory.scrapbook.slots[0].mediaId = secondRecord.content.memory.scrapbook.slots[0].mediaId;
    await service.store.atomicWrite(`records/${first.publicationId}.json`, JSON.stringify(firstRecord));

    const firstToken = new URL(first.shareUrl).pathname.split("/").pop();
    await assert.rejects(
      service.refreshMedia(firstToken),
      (error) => error instanceof PersistenceError && error.code === "unavailable",
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
  assert.throws(() => validateGiftUrl("https://[::ffff:8.8.8.8]/redeem"));
  assert.throws(() => validateGiftUrl("https://gift.example.com/redeem?id=1"));
  assert.throws(() => validateGiftUrl("https://m.tb.cn/h.example"));
  assert.throws(() => validateGiftUrl("https://item.taobao.com.evil.example/item.htm?id=123456789"));
  assert.throws(() => validateGiftUrl("https://item.taobao.com/item.htm?id=123456789"));
  assert.throws(() => validateGiftUrl("https://item.jd.com/100012345678.html"));
  assert.throws(() => validateGiftUrl("https://i.tb.cn/h.SafeGift123?tk=SafeToken123&tk=OtherToken456"));
  assert.throws(() => validateGiftUrl("https://i.tb.cn/h.SafeGift123?tk=SafeToken123&from=share"));
  assert.throws(() => validateGiftUrl(`https://trade.m.jd.com/present?id=${"A".repeat(24)}&from=share`));
  assert.throws(() => validateGiftUrl(`https://trade.m.jd.com/present?id=${"A".repeat(24)}#gift`));
  assert.equal(validateGiftUrl("https://3.cn/-SafeGift123"), "https://3.cn/-SafeGift123");
  assert.equal(
    validateGiftUrl("https://I.TB.CN/h.SafeGift123?tk=SafeToken123"),
    "https://i.tb.cn/h.SafeGift123?tk=SafeToken123",
  );
  assert.equal(
    validateGiftUrl("【京东】https://3.cn/-SafeGift123 「送你一份礼物～」"),
    "https://3.cn/-SafeGift123",
  );
});

test("permanently deletes content and media and prevents idempotent resurrection", async () => {
  await withService(async ({ service, dataDir }) => {
    const source = await sharp({ create: { width: 80, height: 80, channels: 3, background: "#fa907b" } }).png().toBuffer();
    const imageUrl = `data:image/png;base64,${source.toString("base64")}`;
    const content = cardContent({
      memory: { kind: "scrapbook", scrapbook: { templateId: "one-photo", description: "", slots: [{ id: "memory-1", imageUrl, transform: { x: 0, y: 0, scale: 1 } }] } },
    });
    const operation = operationKey("permanent-delete");
    const published = await service.publish(content, operation);
    const token = new URL(published.shareUrl).pathname.split("/").pop();
    assert.equal((await service.load(token)).status, "active");
    assert.equal((await readdir(path.join(dataDir, "blobs"))).length, 1);

    const deleted = await service.deletePublication(published.publicationId, published.managerToken);
    assert.equal(deleted.status, "deleted");
    assert.equal((await service.load(token)).status, "not-found");
    assert.equal((await readdir(path.join(dataDir, "blobs"))).length, 0);
    assert.equal((await readdir(path.join(dataDir, "media"))).length, 0);
    await assert.rejects(readFile(path.join(dataDir, "records", `${published.publicationId}.json`)));
    assert.equal((await service.getManaged(published.publicationId, published.managerToken)).status, "deleted");
    await assert.rejects(service.publish(content, operation, published.managerToken), (error) => error instanceof PersistenceError && error.code === "conflict");
  });
});

test("interrupted permanent deletion stays private, reports pending cleanup, and safely retries every cleanup step", async (t) => {
  const targets = [
    { name: "image blob", matches: (relativePath) => relativePath.startsWith("blobs/") },
    { name: "media record", matches: (relativePath) => relativePath.startsWith("media/") },
    { name: "public index", matches: (relativePath) => relativePath.startsWith("public/") },
    { name: "publication record", matches: (relativePath) => relativePath.startsWith("records/") },
  ];

  for (const target of targets) {
    await t.test(target.name, async () => {
      await withService(async ({ service, dataDir }) => {
        const content = await scrapbookContent();
        const operation = operationKey(`interrupted-delete-${target.name}`);
        const published = await service.publish(content, operation);
        const publicToken = new URL(published.shareUrl).pathname.split("/").pop();
        const loaded = await service.load(publicToken);
        assert.equal(loaded.status, "active");
        const mediaUrl = new URL(loaded.surprise.memory.scrapbook.slots[0].imageUrl);
        const mediaId = mediaUrl.pathname.split("/").pop();

        const other = await service.publish(cardContent({ recipient: { displayName: "Other" } }), operationKey(`other-${target.name}`));
        const otherPublicToken = new URL(other.shareUrl).pathname.split("/").pop();

        await interruptDelete(service, published, target.matches);

        assert.equal((await service.load(publicToken)).status, "not-found");
        assert.equal((await service.refreshMedia(publicToken)).status, "not-found");
        await assert.rejects(
          service.media(mediaId, mediaUrl.searchParams.get("expires"), mediaUrl.searchParams.get("signature")),
          (error) => error instanceof PersistenceError && error.code === "not-found",
        );
        assert.equal((await service.getManaged(published.publicationId, published.managerToken)).status, "deleting");
        await assert.rejects(
          service.deletePublication(published.publicationId, deriveToken(secret, "wrong-delete-manager")),
          (error) => error instanceof PersistenceError && error.code === "forbidden",
        );

        const retried = await service.deletePublication(published.publicationId, published.managerToken);
        assert.equal(retried.status, "deleted");
        assert.equal((await service.getManaged(published.publicationId, published.managerToken)).status, "deleted");
        await assert.rejects(readFile(path.join(dataDir, "records", `${published.publicationId}.json`)));
        await assert.rejects(readFile(path.join(dataDir, "public", `${hashSecret(publicToken, service.config.shareTokenPepper)}.json`)));
        assert.deepEqual(await readdir(path.join(dataDir, "blobs")), []);
        assert.deepEqual(await readdir(path.join(dataDir, "media")), []);
        assert.equal(JSON.parse(await readFile(path.join(dataDir, "tombstones", `${published.publicationId}.json`), "utf8")).status, "deleted");
        await assert.rejects(
          service.publish(content, operation, published.managerToken),
          (error) => error instanceof PersistenceError && error.code === "conflict",
        );

        assert.equal((await service.load(otherPublicToken)).status, "active");
        await service.revoke(other.publicationId, other.managerToken);
        assert.equal((await service.load(otherPublicToken)).status, "closed");
      });
    });
  }
});

test("permanent deletion proves missing media files absent and stops on unreadable or foreign media records", async (t) => {
  await t.test("missing media record", async () => {
    await withService(async ({ service, dataDir }) => {
      const published = await service.publish(await scrapbookContent(), operationKey("missing-media-record"));
      const publicToken = new URL(published.shareUrl).pathname.split("/").pop();
      const loaded = await service.load(publicToken);
      const mediaId = new URL(loaded.surprise.memory.scrapbook.slots[0].imageUrl).pathname.split("/").pop();
      await service.store.remove(`media/${mediaId}.json`);

      assert.equal((await readdir(path.join(dataDir, "blobs"))).length, 1);
      assert.equal((await service.deletePublication(published.publicationId, published.managerToken)).status, "deleted");
      assert.deepEqual(await readdir(path.join(dataDir, "blobs")), []);
      await assert.rejects(readFile(path.join(dataDir, "records", `${published.publicationId}.json`)));
    });
  });

  for (const corruption of ["unreadable", "foreign"] ) {
    await t.test(`${corruption} media record`, async () => {
      await withService(async ({ service, dataDir }) => {
        const published = await service.publish(await scrapbookContent(), operationKey(`${corruption}-media-record`));
        const publicToken = new URL(published.shareUrl).pathname.split("/").pop();
        const loaded = await service.load(publicToken);
        const mediaId = new URL(loaded.surprise.memory.scrapbook.slots[0].imageUrl).pathname.split("/").pop();
        const mediaPath = `media/${mediaId}.json`;
        const original = await readFile(path.join(dataDir, mediaPath), "utf8");
        const replacement = corruption === "unreadable"
          ? "{not-json"
          : JSON.stringify({ ...JSON.parse(original), publicationId: "f".repeat(32) });
        await service.store.atomicWrite(mediaPath, replacement);

        await assert.rejects(service.deletePublication(published.publicationId, published.managerToken));
        assert.equal((await service.getManaged(published.publicationId, published.managerToken)).status, "deleting");
        assert.equal((await service.load(publicToken)).status, "not-found");
        assert.equal((await readdir(path.join(dataDir, "blobs"))).length, 1);
        assert.equal((await readdir(path.join(dataDir, "records"))).length, 1);

        await service.store.atomicWrite(mediaPath, original);
        assert.equal((await service.deletePublication(published.publicationId, published.managerToken)).status, "deleted");
        assert.deepEqual(await readdir(path.join(dataDir, "blobs")), []);
        assert.deepEqual(await readdir(path.join(dataDir, "media")), []);
      });
    });
  }
});

test("maintenance retries tombstoned cleanup, isolates failures, and logs only safe diagnostics", async () => {
  await withService(async ({ service }) => {
    const content = await scrapbookContent();
    const targets = [
      { name: "blob", matches: (relativePath) => relativePath.startsWith("blobs/") },
      { name: "media", matches: (relativePath) => relativePath.startsWith("media/") },
      { name: "public", matches: (relativePath) => relativePath.startsWith("public/") },
      { name: "record", matches: (relativePath) => relativePath.startsWith("records/") },
    ];
    const interrupted = [];
    for (const target of targets) {
      const published = await service.publish(content, operationKey(`maintenance-incomplete-${target.name}`));
      await interruptDelete(service, published, target.matches);
      interrupted.push(published);
    }
    const [first, ...others] = interrupted;

    const remove = service.store.remove.bind(service.store);
    service.store.remove = async (relativePath) => {
      if (relativePath === `records/${first.publicationId}.json`) {
        throw new Error("Injected maintenance failure with no private data");
      }
      return remove(relativePath);
    };
    const logs = [];
    const originalError = console.error;
    console.error = (...args) => logs.push(args);
    try {
      assert.equal(await service.cleanupExpired(), 3);
    } finally {
      console.error = originalError;
      service.store.remove = remove;
    }

    assert.equal((await service.getManaged(first.publicationId, first.managerToken)).status, "deleting");
    for (const completed of others) {
      assert.equal((await service.getManaged(completed.publicationId, completed.managerToken)).status, "deleted");
    }
    assert.equal(logs.length, 1);
    const diagnostic = JSON.stringify(logs[0]);
    assert.match(diagnostic, new RegExp(first.publicationId));
    assert.doesNotMatch(diagnostic, new RegExp(first.managerToken));
    assert.doesNotMatch(diagnostic, /虚构测试照片/);
    assert.doesNotMatch(diagnostic, /Injected maintenance failure with no private data/);

    assert.equal(await service.cleanupExpired(), 1);
    assert.equal((await service.getManaged(first.publicationId, first.managerToken)).status, "deleted");
  });
});

test("maintenance permanently removes expired publications", async () => {
  await withService(async ({ service, dataDir, setNow }) => {
    const published = await service.publish(cardContent(), operationKey("expired-cleanup"));
    const token = new URL(published.shareUrl).pathname.split("/").pop();
    setNow("2027-09-12T00:00:01.000Z");

    assert.equal(await service.cleanupExpired(), 1);
    assert.equal((await service.load(token)).status, "not-found");
    assert.equal((await service.getManaged(published.publicationId, published.managerToken)).status, "deleted");
    await assert.rejects(readFile(path.join(dataDir, "records", `${published.publicationId}.json`)));
  });
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
        ? { kind: "link", title: "", description: "", externalUrl: "https://3.cn/-SafeGift123" }
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
