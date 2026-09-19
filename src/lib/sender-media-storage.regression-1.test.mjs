import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultSenderDraft } from "./sender-preview.ts";
import { withMediaReferencesForStorage } from "./sender-portrait-media-storage.ts";

// Regression: ISSUE-004 — three scrapbook photos exceeded localStorage and disappeared after refresh.
// Found by /qa on 2026-09-19.
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-09-19.md
test("large scrapbook photos are replaced by lightweight IndexedDB references in the saved envelope", () => {
  const draft = createDefaultSenderDraft();
  draft.scrapbook.slots = [1, 2, 3].map((number) => ({
    id: `memory-${number}`,
    imageUrl: `data:image/png;base64,${"x".repeat(100_000)}`,
    transform: { x: 0, y: 0, scale: 1 },
  }));

  const envelope = withMediaReferencesForStorage(draft);
  assert.equal(JSON.stringify(envelope).length < 10_000, true);
  assert.deepEqual(
    envelope.scrapbook.slots.map((slot) => slot.imageUrl),
    [
      `idb:scrapbook:${draft.draftId}:memory-1`,
      `idb:scrapbook:${draft.draftId}:memory-2`,
      `idb:scrapbook:${draft.draftId}:memory-3`,
    ],
  );
});
