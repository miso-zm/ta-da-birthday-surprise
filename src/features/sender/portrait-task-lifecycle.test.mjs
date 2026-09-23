import assert from "node:assert/strict";
import test from "node:test";
import { PortraitTaskLifecycle } from "./portrait-task-lifecycle.ts";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test("cancel aborts the current portrait stage and restores idle", () => {
  const lifecycle = new PortraitTaskLifecycle();
  for (const stage of ["decoding", "processing", "sticker", "composing"]) {
    const task = lifecycle.begin();
    assert.equal(lifecycle.isCurrent(task), true, stage);
    lifecycle.cancel();
    assert.equal(task.signal.aborted, true, stage);
    assert.equal(lifecycle.busy, false, stage);
    assert.equal(lifecycle.isCurrent(task), false, stage);
  }
});

test("removing after a drag cancels the delayed compose", async () => {
  const lifecycle = new PortraitTaskLifecycle();
  let runs = 0;
  lifecycle.schedule(() => { runs += 1; }, 5);
  lifecycle.cancel();
  await wait(15);
  assert.equal(runs, 0);
  assert.equal(lifecycle.busy, false);
});

test("an old task cannot commit or clear a replacement task", () => {
  const lifecycle = new PortraitTaskLifecycle();
  const first = lifecycle.begin();
  const second = lifecycle.begin();
  assert.equal(first.signal.aborted, true);
  assert.equal(lifecycle.settle(first), false);
  assert.equal(lifecycle.busy, true);
  assert.equal(lifecycle.isCurrent(second), true);
  assert.equal(lifecycle.settle(second), true);
  assert.equal(lifecycle.busy, false);
});

test("continuous replacements only allow the final result to commit", () => {
  const lifecycle = new PortraitTaskLifecycle();
  const committed = [];
  const first = lifecycle.begin();
  const second = lifecycle.begin();
  const third = lifecycle.begin();
  for (const [task, value] of [[first, "first"], [second, "second"], [third, "third"]]) {
    if (lifecycle.isCurrent(task)) committed.push(value);
  }
  assert.deepEqual(committed, ["third"]);
});

test("dispose cancels work and prevents scheduled or late commits", async () => {
  const lifecycle = new PortraitTaskLifecycle();
  const task = lifecycle.begin();
  let runs = 0;
  lifecycle.schedule(() => { runs += 1; }, 5);
  lifecycle.dispose();
  await wait(15);
  assert.equal(task.signal.aborted, true);
  assert.equal(runs, 0);
  assert.equal(lifecycle.busy, false);
  assert.equal(lifecycle.isCurrent(task), false);
  assert.throws(() => lifecycle.begin(), /disposed/);
});
