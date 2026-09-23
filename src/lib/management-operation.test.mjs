import assert from "node:assert/strict";
import test from "node:test";

import { performManagementOperation } from "./management-operation.ts";

test("server deletion remains successful when local history cleanup fails", async () => {
  const result = await performManagementOperation(
    "delete",
    async () => ({ ok: true }),
    () => { throw new Error("local storage denied"); },
  );
  assert.deepEqual(result, { state: "deleted", localCleanupFailed: true });
});

test("a failed server operation is not reported as locally completed", async () => {
  await assert.rejects(
    performManagementOperation("revoke", async () => ({ ok: false }), () => true),
    /server-operation-failed/,
  );
});

test("revoking does not remove the local management entry", async () => {
  let cleanupCalls = 0;
  const result = await performManagementOperation("revoke", async () => ({ ok: true }), () => {
    cleanupCalls += 1;
    return true;
  });
  assert.deepEqual(result, { state: "revoked", localCleanupFailed: false });
  assert.equal(cleanupCalls, 0);
});
