import assert from "node:assert/strict";
import test from "node:test";
import { countDiscardedScrapbookPhotos } from "./scrapbook-template-change.ts";

// Regression: ISSUE-003 — reducing a populated scrapbook layout discarded photos without an explicit confirmation.
// Found by /qa on 2026-09-19.
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-09-19.md
test("counts only usable photos that a smaller scrapbook layout would discard", () => {
  const slots = [
    { id: "memory-1", imageUrl: "data:image/png;base64,one", transform: { x: 0, y: 0, scale: 1 } },
    { id: "memory-2", imageUrl: "data:image/png;base64,two", transform: { x: 0, y: 0, scale: 1 } },
    { id: "memory-3", imageUrl: "data:image/png;base64,three", transform: { x: 0, y: 0, scale: 1 } },
  ];

  assert.equal(countDiscardedScrapbookPhotos(slots, 1), 2);
  assert.equal(countDiscardedScrapbookPhotos(slots, 1, new Set(["memory-3"])), 1);
  assert.equal(countDiscardedScrapbookPhotos(slots, 3), 0);
});
