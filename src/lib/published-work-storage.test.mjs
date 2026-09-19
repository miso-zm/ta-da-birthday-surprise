import assert from "node:assert/strict";
import test from "node:test";
import { readPublishedWorks, rememberPublishedWork } from "./published-work-storage.ts";

const origin = "https://tada.example";
function work(index = 1) {
  const publicationId = index.toString(16).padStart(32, "0");
  return { publicationId, shareUrl: `${origin}/s/${"a".repeat(43)}`, manageUrl: `${origin}/create/manage/${publicationId}`, expiresAt: "2027-09-14T00:00:00Z", recipientName: "测试", memoryKind: "card" };
}
function storage() { let value = null; return { getItem: () => value, setItem: (_, next) => { value = next; } }; }

test("published entries persist, deduplicate and retain only the recent 100", () => {
  const saved = storage();
  for (let i = 1; i <= 105; i++) assert.equal(rememberPublishedWork(saved, work(i), origin), true);
  let entries = readPublishedWorks(saved, origin);
  assert.equal(entries.length, 100);
  assert.equal(entries[0].publicationId, work(105).publicationId);
  rememberPublishedWork(saved, { ...work(105), recipientName: "更新" }, origin);
  entries = readPublishedWorks(saved, origin);
  assert.equal(entries.length, 100);
  assert.equal(entries[0].recipientName, "更新");
  assert.equal(JSON.stringify(entries).includes("managerToken"), false);
});
test("untrusted links and damaged storage are not rendered", () => {
  for (const bad of [{ ...work(), shareUrl: "https://attacker.example/s/" + "a".repeat(43) }, { ...work(), manageUrl: "javascript:alert(1)" }, { ...work(), shareUrl: work().shareUrl + "?secret=test" }]) {
    assert.deepEqual(readPublishedWorks({ getItem: () => JSON.stringify([bad]) }, origin), []);
  }
  assert.deepEqual(readPublishedWorks({ getItem: () => "{" }, origin), []);
  assert.deepEqual(readPublishedWorks({ getItem() { throw new Error("denied"); } }, origin), []);
  assert.equal(rememberPublishedWork({ getItem: () => null, setItem() { throw new Error("quota"); } }, work(), origin), false);
});
