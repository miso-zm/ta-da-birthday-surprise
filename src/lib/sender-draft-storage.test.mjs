import assert from "node:assert/strict";
import test from "node:test";
import { clearSenderDraft, loadSenderDraft } from "./sender-draft-storage.ts";
import { createDefaultSenderDraft, validateSenderDraft, senderDraftToPreview } from "./sender-preview.ts";
import { validatePublicationInput } from "./persistence/validation.ts";

test("new drafts and publications do not require a birthday; old drafts remain readable", () => {
  const draft = createDefaultSenderDraft();
  assert.equal(draft.basics.birthday, undefined);
  assert.equal(validateSenderDraft(draft).basics, undefined);
  assert.equal(loadSenderDraft({ getItem: () => JSON.stringify(draft) }).status, "ready");
  const preview = senderDraftToPreview(draft);
  assert.equal(preview.ok, true);
  assert.equal(validatePublicationInput(preview.preview).content.birthday, undefined);
  draft.basics.birthday = "0828";
  assert.equal(loadSenderDraft({ getItem: () => JSON.stringify(draft) }).status, "ready");
  assert.equal(validatePublicationInput(senderDraftToPreview(draft).preview).content.birthday, "0828");
});

test("denied browser storage returns a recoverable draft state", () => {
  const result = loadSenderDraft({ getItem() { throw new Error("Storage denied"); } });
  assert.equal(result.status, "invalid");
  assert.equal(typeof result.reason, "string");
  assert.equal(clearSenderDraft({ removeItem() { throw new Error("Storage denied"); } }), false);
});

test("portrait editor draft restores locally while preview exposes only the final poster", () => {
  const draft = createDefaultSenderDraft();
  draft.portrait = {
    templateId: "balloon",
    stickerImageUrl: "data:image/png;base64,c3RpY2tlcg==",
    posterImageUrl: "data:image/png;base64,cG9zdGVy",
    transform: { centerX: 0.5, centerY: 0.65, width: 0.68, rotation: 0 },
  };
  const restored = loadSenderDraft({ getItem: () => JSON.stringify(draft) });
  assert.equal(restored.status, "ready");
  const preview = senderDraftToPreview(draft);
  assert.equal(preview.ok, true);
  assert.deepEqual(preview.preview.portrait, {
    templateId: "balloon",
    imageUrl: draft.portrait.posterImageUrl,
  });
  assert.equal(JSON.stringify(preview.preview).includes("stickerImageUrl"), false);
});

test("lightweight IndexedDB portrait references remain valid in the local draft envelope", () => {
  const draft = createDefaultSenderDraft();
  draft.portrait = {
    templateId: "blue",
    stickerImageUrl: `idb:portrait:${draft.draftId}:sticker`,
    posterImageUrl: `idb:portrait:${draft.draftId}:poster`,
    transform: { centerX: 0.52, centerY: 0.61, width: 0.7, rotation: 0 },
  };
  const restored = loadSenderDraft({ getItem: () => JSON.stringify(draft) });
  assert.equal(restored.status, "ready");
  assert.equal(restored.draft.portrait.posterImageUrl.startsWith("idb:portrait:"), true);
});

test("empty and malformed browser storage remain recoverable", () => {
  assert.equal(loadSenderDraft({ getItem: () => null }).status, "empty");
  assert.equal(loadSenderDraft({ getItem: () => "{" }).status, "invalid");
});
