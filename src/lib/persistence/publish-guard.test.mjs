import assert from "node:assert/strict";
import test from "node:test";

import { PersistenceError } from "./errors.ts";
import { acquirePublishSlot, assertPublishRate, resetPublishGuardForTests } from "./publish-guard.ts";

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
