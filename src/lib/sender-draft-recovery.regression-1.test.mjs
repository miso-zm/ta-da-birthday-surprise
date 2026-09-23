import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultSenderDraft, getSenderResumeLocation } from "./sender-preview.ts";

// Regression: ISSUE-001 — refreshing on the portrait step skipped it and resumed at publish.
// Found by /qa on 2026-09-19.
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-09-19.md
test("draft recovery keeps the optional portrait decision in the creation flow", () => {
  const draft = createDefaultSenderDraft();
  draft.gift = { ...draft.gift, kind: "none" };

  assert.deepEqual(getSenderResumeLocation(draft), {
    step: "memory",
    memoryScreen: "portrait",
  });

  draft.portraitChoiceMade = true;
  assert.deepEqual(getSenderResumeLocation(draft), { step: "publish" });
});

test("earlier invalid steps still take precedence over the portrait decision", () => {
  const draft = createDefaultSenderDraft();
  draft.basics.recipientName = "";

  assert.deepEqual(getSenderResumeLocation(draft), { step: "basics" });
});

test("a recovered scrapbook with a missing required photo resumes at photo repair", () => {
  const draft = createDefaultSenderDraft();
  draft.memoryKind = "scrapbook";
  draft.scrapbook = {
    templateId: "two-photo",
    description: "保留的文字",
    slots: [
      { id: "memory-1", imageUrl: "data:image/png;base64,cGhvdG8=", transform: { x: 0, y: 0, scale: 1 } },
      { id: "memory-2", transform: { x: 0, y: 0, scale: 1 } },
    ],
  };

  assert.deepEqual(getSenderResumeLocation(draft), {
    step: "memory",
    memoryScreen: "scrapbook",
  });
});
