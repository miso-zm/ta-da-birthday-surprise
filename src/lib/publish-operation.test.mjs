import assert from "node:assert/strict";
import test from "node:test";

import {
  PublishResultUnknownError,
  createPublishOperationCoordinator,
  runWithPublishTimeout,
} from "./publish-operation.ts";

function storage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
    removeItem: () => { value = null; },
    value: () => value,
  };
}

function keyFactory() {
  let index = 0;
  return () => `${String(++index).padStart(43, "a")}`;
}

test("locks before dispatch so a double publish creates one request", async () => {
  const saved = storage();
  const coordinator = createPublishOperationCoordinator(saved, keyFactory());
  let release;
  let requests = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const request = async () => { requests += 1; await pending; return { publicationId: "one" }; };

  const first = coordinator.publish("draft-1:version-a", request);
  const second = coordinator.publish("draft-1:version-a", request);
  assert.strictEqual(first, second);
  await Promise.resolve();
  assert.equal(requests, 1);
  release();
  await first;
});

test("response loss and refresh reuse one minimal idempotent operation", async () => {
  const saved = storage();
  const createKey = keyFactory();
  const publications = new Map();
  const seenKeys = [];
  const first = createPublishOperationCoordinator(saved, createKey);

  await assert.rejects(first.publish("draft-1:version-a", async (key) => {
    seenKeys.push(key);
    publications.set(key, { publicationId: "only-one" });
    throw new PublishResultUnknownError();
  }), PublishResultUnknownError);

  const persisted = saved.value();
  assert.ok(persisted);
  assert.deepEqual(Object.keys(JSON.parse(persisted)).sort(), ["idempotencyKey", "schemaVersion", "signature", "state"]);
  assert.equal(/photo|share|manager|content|gift/i.test(persisted), false);

  const refreshed = createPublishOperationCoordinator(saved, createKey);
  const result = await refreshed.publish("draft-1:version-a", async (key) => {
    seenKeys.push(key);
    return publications.get(key);
  });
  assert.equal(result.publicationId, "only-one");
  assert.equal(publications.size, 1);
  assert.equal(seenKeys[0], seenKeys[1]);
  assert.equal(saved.value(), null);
});

test("changing content starts a new operation instead of reusing an unknown one", async () => {
  const saved = storage();
  const createKey = keyFactory();
  const coordinator = createPublishOperationCoordinator(saved, createKey);
  let firstKey = "";
  await assert.rejects(coordinator.publish("draft-1:version-a", async (key) => {
    firstKey = key;
    throw new PublishResultUnknownError();
  }));
  let secondKey = "";
  await coordinator.publish("draft-1:version-b", async (key) => { secondKey = key; });
  assert.notEqual(secondKey, firstKey);
});

test("a client timeout becomes a bounded unknown result and aborts its request", async () => {
  let aborted = false;
  await assert.rejects(
    runWithPublishTimeout((signal) => new Promise(() => {
      signal.addEventListener("abort", () => { aborted = true; }, { once: true });
    }), 5),
    PublishResultUnknownError,
  );
  assert.equal(aborted, true);
});

test("storage failure does not break the in-page single-flight lock", async () => {
  const denied = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
    removeItem() { throw new Error("denied"); },
  };
  const coordinator = createPublishOperationCoordinator(denied, keyFactory());
  let requests = 0;
  const first = coordinator.publish("draft-1:version-a", async () => { requests += 1; return "ok"; });
  const second = coordinator.publish("draft-1:version-a", async () => { requests += 1; return "duplicate"; });
  assert.strictEqual(first, second);
  assert.equal(await first, "ok");
  assert.equal(requests, 1);
});
