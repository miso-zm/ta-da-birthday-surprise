import assert from "node:assert/strict";
import test from "node:test";
import { clearSenderDraft, loadSenderDraft, saveSenderDraft, SENDER_DRAFT_STORAGE_KEY } from "./sender-draft-storage.ts";
import {
  loadSenderDraftWithMedia,
  saveSenderDraftWithMedia,
} from "./sender-portrait-media-storage.ts";
import { createDefaultSenderDraft, validateSenderDraft, senderDraftToPreview } from "./sender-preview.ts";
import { validatePublicationInput } from "./persistence/validation.ts";

function memoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: (key) => key === SENDER_DRAFT_STORAGE_KEY ? value : null,
    setItem: (key, next) => { if (key === SENDER_DRAFT_STORAGE_KEY) value = next; },
    removeItem: (key) => { if (key === SENDER_DRAFT_STORAGE_KEY) value = null; },
    value: () => value,
  };
}

function memoryMediaAccess() {
  const values = new Map();
  return {
    values,
    async writeDraftMedia(draft) {
      if (draft.portrait) {
        values.set(`${draft.draftId}:sticker`, draft.portrait.stickerImageUrl);
        values.set(`${draft.draftId}:poster`, draft.portrait.posterImageUrl);
      }
      draft.scrapbook.slots.forEach((slot) => {
        if (slot.imageUrl) values.set(`scrapbook:${draft.draftId}:${slot.id}`, slot.imageUrl);
      });
    },
    async readPortraitMedia(draftId) {
      return {
        sticker: values.get(`${draftId}:sticker`),
        poster: values.get(`${draftId}:poster`),
      };
    },
    async readScrapbookMedia(draft) {
      const missingSlotIds = [];
      const slots = draft.scrapbook.slots.map((slot) => {
        if (!slot.imageUrl?.startsWith("idb:scrapbook:")) return slot;
        const imageUrl = values.get(`scrapbook:${draft.draftId}:${slot.id}`);
        if (!imageUrl) {
          missingSlotIds.push(slot.id);
          const slotWithoutImage = { ...slot };
          delete slotWithoutImage.imageUrl;
          return slotWithoutImage;
        }
        return { ...slot, imageUrl };
      });
      return { slots, missingSlotIds };
    },
  };
}

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

test("draft storage never keeps failed gift share text or an earlier valid URL", () => {
  const storage = memoryStorage();
  const draft = createDefaultSenderDraft();
  draft.gift = {
    kind: "link",
    title: "",
    description: "",
    externalUrl: "送你一份礼物，提取码：FAKE1，但这里没有可识别链接",
  };
  assert.equal(saveSenderDraft(storage, draft).ok, true);
  let saved = JSON.parse(storage.value());
  assert.equal(saved.gift.externalUrl, "");
  assert.equal(storage.value().includes("FAKE1"), false);

  draft.gift.externalUrl = "https://3.cn/-ValidGiftA";
  assert.equal(saveSenderDraft(storage, draft).ok, true);
  draft.gift.externalUrl = "无效内容 B";
  assert.equal(saveSenderDraft(storage, draft).ok, true);
  saved = JSON.parse(storage.value());
  assert.equal(saved.gift.externalUrl, "");
  assert.equal(storage.value().includes("ValidGiftA"), false);
  assert.equal(storage.value().includes("无效内容 B"), false);
});

test("legacy gift share text is normalized in storage without losing the rest of the draft", () => {
  const validLegacy = createDefaultSenderDraft();
  validLegacy.basics.recipientName = "Nana";
  validLegacy.gift = {
    kind: "link",
    title: "旧标题",
    description: "旧描述",
    externalUrl: "送你一份礼物\n提取码：FAKE2\nhttps://i.tb.cn/h.SafeGift123?tk=SafeToken123",
  };
  const validStorage = memoryStorage(JSON.stringify(validLegacy));
  const validResult = loadSenderDraft(validStorage);
  assert.equal(validResult.status, "ready");
  assert.equal(validResult.draft.basics.recipientName, "Nana");
  assert.equal(validResult.draft.gift.externalUrl, "https://i.tb.cn/h.SafeGift123?tk=SafeToken123");
  assert.equal(validStorage.value().includes("FAKE2"), false);
  assert.equal(JSON.parse(validStorage.value()).gift.externalUrl, "https://i.tb.cn/h.SafeGift123?tk=SafeToken123");
  validResult.draft.portraitChoiceMade = true;
  validResult.draft.unlock = { kind: "none" };
  const validPreview = senderDraftToPreview(validResult.draft);
  assert.equal(validPreview.ok, true);
  const validPublishBody = JSON.stringify({ content: validPreview.preview, consent: { termsAccepted: true } });
  assert.equal(validPublishBody.includes("FAKE2"), false);
  assert.equal(JSON.parse(validPublishBody).content.gift.externalUrl, "https://i.tb.cn/h.SafeGift123?tk=SafeToken123");

  const invalidLegacy = createDefaultSenderDraft();
  invalidLegacy.basics.recipientName = "Lina";
  invalidLegacy.gift = {
    kind: "link",
    title: "旧标题",
    description: "旧描述",
    externalUrl: "提取码：FAKE3 https://3.cn/-GiftOne https://3.cn/-GiftTwo",
  };
  const invalidStorage = memoryStorage(JSON.stringify(invalidLegacy));
  const invalidResult = loadSenderDraft(invalidStorage);
  assert.equal(invalidResult.status, "ready");
  assert.equal(invalidResult.draft.basics.recipientName, "Lina");
  assert.deepEqual(invalidResult.draft.gift, { kind: "link", title: "", description: "", externalUrl: "" });
  assert.match(invalidResult.notice, /重新填写/);
  assert.equal(invalidStorage.value().includes("FAKE3"), false);
  assert.equal(invalidStorage.value().includes("GiftOne"), false);
});

test("no-gift preview and publish content clear every previous gift field", () => {
  const draft = createDefaultSenderDraft();
  draft.portraitChoiceMade = true;
  draft.unlock = { kind: "none" };
  draft.gift = {
    kind: "none",
    title: "不应发布的旧标题",
    description: "不应发布的旧描述",
    externalUrl: "https://3.cn/-OldGiftLink",
  };
  const preview = senderDraftToPreview(draft);
  assert.equal(preview.ok, true);
  assert.deepEqual(preview.preview.gift, { kind: "none", title: "", description: "", externalUrl: "" });
  const publishBody = JSON.stringify({ content: preview.preview, consent: { termsAccepted: true } });
  assert.equal(publishBody.includes("OldGiftLink"), false);
  assert.equal(publishBody.includes("不应发布"), false);
  assert.deepEqual(validatePublicationInput(JSON.parse(publishBody).content).content.gift, {
    kind: "none", title: "", description: "", externalUrl: "",
  });
});

test("saved draft B replaces recovered draft A across a real save and load handoff", async () => {
  const storage = memoryStorage();
  const media = memoryMediaAccess();
  const draftA = createDefaultSenderDraft();
  draftA.basics.recipientName = "A";

  assert.equal((await saveSenderDraftWithMedia(storage, draftA, media)).ok, true);
  const recoveredA = await loadSenderDraftWithMedia(storage, media);
  assert.equal(recoveredA.status, "ready");

  const draftB = {
    ...recoveredA.draft,
    basics: { ...recoveredA.draft.basics, recipientName: "B" },
    updatedAt: "2026-09-21T08:30:00.000Z",
  };
  assert.equal((await saveSenderDraftWithMedia(storage, draftB, media)).ok, true);

  const recoveredB = await loadSenderDraftWithMedia(storage, media);
  assert.equal(recoveredB.status, "ready");
  assert.equal(recoveredB.draft.basics.recipientName, "B");
  assert.equal(recoveredB.draft.updatedAt, draftB.updatedAt);
});

test("missing portrait and one scrapbook image preserve the rest and clean stale references", async () => {
  const storage = memoryStorage();
  const media = memoryMediaAccess();
  const draft = createDefaultSenderDraft();
  draft.basics.recipientName = "Mia";
  draft.memoryKind = "scrapbook";
  draft.scrapbook = {
    templateId: "two-photo",
    description: "保留这段回忆文字",
    slots: [
      { id: "memory-1", imageUrl: "data:image/png;base64,cGhvdG8tMQ==", transform: { x: 0.1, y: 0, scale: 1.1 } },
      { id: "memory-2", imageUrl: "data:image/png;base64,cGhvdG8tMg==", transform: { x: 0, y: -0.1, scale: 1.2 } },
    ],
  };
  draft.portraitChoiceMade = true;
  draft.portrait = {
    templateId: "blue",
    stickerImageUrl: "data:image/png;base64,c3RpY2tlcg==",
    posterImageUrl: "data:image/png;base64,cG9zdGVy",
    transform: { centerX: 0.5, centerY: 0.6, width: 0.7, rotation: 0 },
  };
  assert.equal((await saveSenderDraftWithMedia(storage, draft, media)).ok, true);

  media.values.delete(`${draft.draftId}:poster`);
  media.values.delete(`scrapbook:${draft.draftId}:memory-2`);
  const recovered = await loadSenderDraftWithMedia(storage, media);

  assert.equal(recovered.status, "ready");
  assert.equal(recovered.draft.basics.recipientName, "Mia");
  assert.equal(recovered.draft.scrapbook.description, "保留这段回忆文字");
  assert.equal(recovered.draft.scrapbook.slots[0].imageUrl, "data:image/png;base64,cGhvdG8tMQ==");
  assert.equal(recovered.draft.scrapbook.slots[0].transform.scale, 1.1);
  assert.equal(recovered.draft.scrapbook.slots[1].imageUrl, undefined);
  assert.equal(recovered.draft.scrapbook.slots[1].transform.scale, 1.2);
  assert.equal(recovered.draft.portrait, undefined);
  assert.equal(recovered.draft.portraitChoiceMade, false);
  assert.match(recovered.notice, /主角海报.*重新上传或跳过/);
  assert.match(recovered.notice, /手帐照片.*重新上传/);
  assert.match(validateSenderDraft(recovered.draft).memory[0], /照片/);

  const rewritten = storage.value();
  assert.equal(rewritten.includes(`idb:portrait:${draft.draftId}`), false);
  assert.equal(rewritten.includes(`idb:scrapbook:${draft.draftId}:memory-2`), false);
  assert.equal(rewritten.includes(`idb:scrapbook:${draft.draftId}:memory-1`), true);
});
