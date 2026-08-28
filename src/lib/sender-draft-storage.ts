import {
  FIND_GIFT_TARGET_IDS,
  type SenderDraft,
  type SenderUnlockDraft,
} from "./surprise-contract";

export const SENDER_DRAFT_STORAGE_KEY = "ta-da:sender-draft:v1";

export type SenderDraftLoadResult =
  | { status: "empty" }
  | { status: "ready"; draft: SenderDraft }
  | { status: "invalid"; reason: string };

export type SenderDraftSaveResult =
  | { ok: true }
  | { ok: false; reason: string };

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isSenderUnlockDraft(value: unknown): value is SenderUnlockDraft {
  if (!isRecord(value)) {
    return false;
  }

  if (value.kind === "rps" || value.kind === "birthday-password") {
    return true;
  }

  return (
    value.kind === "find-gift" &&
    isString(value.targetId) &&
    FIND_GIFT_TARGET_IDS.includes(
      value.targetId as (typeof FIND_GIFT_TARGET_IDS)[number],
    )
  );
}

function isScrapbookSlot(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.caption) &&
    (value.imageUrl === undefined || isString(value.imageUrl))
  );
}

export function isSenderDraft(value: unknown): value is SenderDraft {
  if (!isRecord(value) || value.version !== 1) {
    return false;
  }

  return (
    typeof value.draftId === "string" &&
    typeof value.updatedAt === "string" &&
    isRecord(value.basics) &&
    isSenderUnlockDraft(value.unlock) &&
    isRecord(value.card) &&
    isRecord(value.scrapbook) &&
    isRecord(value.gift) &&
    isString(value.basics.recipientName) &&
    isString(value.basics.senderName) &&
    isString(value.basics.birthday) &&
    isString(value.basics.openingTemplateId) &&
    isString(value.basics.openingTitle) &&
    isString(value.basics.openingPrompt) &&
    isString(value.card.templateId) &&
    isString(value.card.message) &&
    isString(value.card.signature) &&
    isString(value.scrapbook.templateId) &&
    isString(value.scrapbook.title) &&
    Array.isArray(value.scrapbook.slots) &&
    value.scrapbook.slots.every(isScrapbookSlot) &&
    isString(value.gift.title) &&
    isString(value.gift.description) &&
    isString(value.gift.externalUrl)
  );
}

export function loadSenderDraft(
  storage: ReadableStorage,
): SenderDraftLoadResult {
  const serialized = storage.getItem(SENDER_DRAFT_STORAGE_KEY);

  if (!serialized) {
    return { status: "empty" };
  }

  try {
    const parsed: unknown = JSON.parse(serialized);
    return isSenderDraft(parsed)
      ? { status: "ready", draft: parsed }
      : { status: "invalid", reason: "草稿格式已过期或不完整。" };
  } catch {
    return { status: "invalid", reason: "草稿内容无法读取。" };
  }
}

export function saveSenderDraft(
  storage: WritableStorage,
  draft: SenderDraft,
): SenderDraftSaveResult {
  try {
    storage.setItem(SENDER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return { ok: true };
  } catch {
    return { ok: false, reason: "浏览器空间不足，草稿暂时无法保存。" };
  }
}

export function clearSenderDraft(storage: WritableStorage): void {
  storage.removeItem(SENDER_DRAFT_STORAGE_KEY);
}

export function getBrowserDraftStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
