import assert from "node:assert/strict";
import test from "node:test";

import { PersistenceError } from "./errors.ts";
import {
  acquirePublishSlot,
  assertPublishRate,
  getPublishGuardBucketCountForTests,
  resetPublishGuardForTests,
} from "./publish-guard.ts";

test("limits repeated publish attempts from the same address", () => {
  resetPublishGuardForTests();
  const request = new Request("https://tada.example/api/publish", {
    headers: { "x-real-ip": "203.0.113.7" },
  });
  const now = new Date("2026-09-20T10:15:00.000Z");
  for (let index = 0; index < 6; index += 1) assertPublishRate(request, now);
  assert.throws(
    () => assertPublishRate(request, now),
    (error) => error instanceof PersistenceError && error.code === "rate-limited",
  );
  resetPublishGuardForTests();
});

test("allows one active publish and one queued publish", async () => {
  resetPublishGuardForTests();
  const releaseFirst = await acquirePublishSlot();
  const second = acquirePublishSlot();
  await assert.rejects(
    acquirePublishSlot(),
    (error) => error instanceof PersistenceError && error.code === "rate-limited",
  );
  releaseFirst();
  const releaseSecond = await second;
  releaseSecond();
  resetPublishGuardForTests();
});

test("distinguishes the daily limit and recovers on the next day", () => {
  resetPublishGuardForTests();
  const request = new Request("https://tada.example/api/publish", { headers: { "x-real-ip": "203.0.113.8" } });
  for (let index = 0; index < 20; index += 1) {
    assertPublishRate(request, new Date(Date.UTC(2026, 8, 20, 0, index, 0)));
  }
  assert.throws(
    () => assertPublishRate(request, new Date("2026-09-20T23:00:00.000Z")),
    (error) => error instanceof PersistenceError && error.code === "daily-rate-limited",
  );
  assert.doesNotThrow(() => assertPublishRate(request, new Date("2026-09-21T00:00:00.000Z")));
  resetPublishGuardForTests();
});

test("evicts stale rate-limit buckets", () => {
  resetPublishGuardForTests();
  for (let index = 0; index < 25; index += 1) {
    assertPublishRate(new Request("https://tada.example/api/publish", { headers: { "x-real-ip": `203.0.113.${index}` } }), new Date("2026-09-18T00:00:00.000Z"));
  }
  assert.equal(getPublishGuardBucketCountForTests(), 25);
  assertPublishRate(new Request("https://tada.example/api/publish", { headers: { "x-real-ip": "198.51.100.1" } }), new Date("2026-09-21T00:00:00.000Z"));
  assert.equal(getPublishGuardBucketCountForTests(), 1);
  resetPublishGuardForTests();
});

test("a queued publish can time out without taking the next slot", async () => {
  resetPublishGuardForTests();
  const releaseFirst = await acquirePublishSlot();
  await assert.rejects(
    acquirePublishSlot({ timeoutMs: 5 }),
    (error) => error instanceof PersistenceError && error.code === "rate-limited",
  );
  releaseFirst();
  const releaseNext = await acquirePublishSlot();
  releaseNext();
  resetPublishGuardForTests();
});

test("a queued publish can be cancelled while an active publish keeps its slot", async () => {
  resetPublishGuardForTests();
  const activeController = new AbortController();
  const releaseFirst = await acquirePublishSlot({ signal: activeController.signal });
  const queuedController = new AbortController();
  const queued = acquirePublishSlot({ signal: queuedController.signal, timeoutMs: 1_000 });
  queuedController.abort();
  await assert.rejects(
    queued,
    (error) => error instanceof PersistenceError && error.code === "unavailable",
  );
  activeController.abort();
  const next = acquirePublishSlot({ timeoutMs: 1_000 });
  releaseFirst();
  const releaseNext = await next;
  releaseNext();
  resetPublishGuardForTests();
});
