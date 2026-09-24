import assert from "node:assert/strict";
import test from "node:test";

import { usesMemoryComposerLayout } from "./sender-layout-state.ts";

test("memory content switching keeps one stable page layout", () => {
  assert.equal(usesMemoryComposerLayout("memory", "choice"), true);
  assert.equal(usesMemoryComposerLayout("memory", "portrait"), false);
  assert.equal(usesMemoryComposerLayout("gift", "choice"), false);
});
