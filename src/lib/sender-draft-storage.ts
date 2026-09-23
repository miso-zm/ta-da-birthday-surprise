import {
  FIND_GIFT_TARGET_IDS,
  SCRAPBOOK_DESCRIPTION_MAX_LENGTH,
  SCRAPBOOK_TEMPLATE_SLOT_COUNTS,
  type SenderDraft,
  type SenderUnlockDraft,
  type ScrapbookTemplateId,
  PORTRAIT_TEMPLATE_IDS,
} from "./surprise-contract";
import { getPublicGiftLink } from "./gift-link-policy";

export const SENDER_DRAFT_STORAGE_KEY = "ta-da:sender-draft:v1";

export type SenderDraftLoadResult =
  | { status: "empty" }
  | { status: "ready"; draft: SenderDraft; notice?: string }
  | { status: "invalid"; reason: string };

export type SenderDraftSaveResult =
  | { ok: true }
  | { ok: false; reason: string };

type ReadableStorage = Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

const LEGACY_FIND_GIFT_TARGETS = {
  "cabinet-gift": "rug-box",
  "sofa-gift": "sofa-box",
  "plant-gift": "plant-box",
} as const;

function migrateLegacySenderDraft(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  let migrated = value;

  if (isRecord(migrated.unlock) && migrated.unlock.kind === "birthday-password") {
    migrated = { ...migrated, unlock: { kind: "blow-candles" } };
  }

  if (
    isRecord(migrated.unlock) &&
    migrated.unlock.kind === "find-gift" &&
    isString(migrated.unlock.targetId) &&
    migrated.unlock.targetId in LEGACY_FIND_GIFT_TARGETS
  ) {
    const legacyTarget = migrated.unlock.targetId as keyof typeof LEGACY_FIND_GIFT_TARGETS;
    migrated = {
      ...migrated,
      unlock: {
        ...migrated.unlock,
        targetId: LEGACY_FIND_GIFT_TARGETS[legacyTarget],
      },
    };
  }

  if (isRecord(migrated.gift) && migrated.gift.kind === undefined) {
    migrated = {
      ...migrated,
      gift: {
        ...migrated.gift,
        kind: isString(migrated.gift.externalUrl) && migrated.gift.externalUrl.trim()
          ? "link"
          : "none",
      },
    };
  }

  if (isRecord(migrated.scrapbook) && Array.isArray(migrated.scrapbook.slots)) {
    const legacySlots = migrated.scrapbook.slots.filter(isRecord);
    const rawTemplate = isString(migrated.scrapbook.templateId)
      ? migrated.scrapbook.templateId
      : "one-photo";
    const templateId: ScrapbookTemplateId = rawTemplate === "one-photo" || rawTemplate === "one-memory"
      ? "one-photo"
      : rawTemplate === "two-photo" || rawTemplate === "two-memories"
        ? "two-photo"
        : "three-photo";
    const slotCount = SCRAPBOOK_TEMPLATE_SLOT_COUNTS[templateId];
    const firstLegacyCaption = legacySlots
      .map((slot) => slot.caption)
      .find(isString);
    const legacyDescription = isString(migrated.scrapbook.description)
      ? migrated.scrapbook.description
      : isString(migrated.scrapbook.title)
        ? migrated.scrapbook.title
        : firstLegacyCaption;
    const slots = Array.from({ length: slotCount }, (_, index) => {
      const oldSlot = legacySlots[index];
      const oldTransform = oldSlot && isRecord(oldSlot.transform) ? oldSlot.transform : null;
      return {
        id: oldSlot && isString(oldSlot.id) ? oldSlot.id : `memory-${index + 1}`,
        ...(oldSlot && isString(oldSlot.imageUrl) ? { imageUrl: oldSlot.imageUrl } : {}),
        transform: {
          x: oldTransform && typeof oldTransform.x === "number" ? oldTransform.x : 0,
          y: oldTransform && typeof oldTransform.y === "number" ? oldTransform.y : 0,
          scale: oldTransform && typeof oldTransform.scale === "number" ? oldTransform.scale : 1,
        },
      };
    });
    migrated = {
      ...migrated,
      version: 2,
      scrapbook: {
        templateId,
        description: isString(legacyDescription)
          ? legacyDescription.slice(0, SCRAPBOOK_DESCRIPTION_MAX_LENGTH)
          : "",
        slots,
      },
    };
  }

  return migrated;
}

function normalizeStoredGift(value: unknown): { value: unknown; changed: boolean; notice?: string } {
  if (!isRecord(value) || !isRecord(value.gift)) return { value, changed: false };
  const gift = value.gift;
  if (gift.kind === "none") {
    const normalizedGift = { kind: "none", title: "", description: "", externalUrl: "" };
    return {
      value: { ...value, gift: normalizedGift },
      changed: JSON.stringify(gift) !== JSON.stringify(normalizedGift),
    };
  }
  if (gift.kind !== "link" || !isString(gift.externalUrl)) return { value, changed: false };
  const link = getPublicGiftLink(gift.externalUrl);
  const hadUnrecognizedInput = Boolean(gift.externalUrl.trim() && !link);
  const normalizedGift = {
    kind: "link",
    title: "",
    description: "",
    externalUrl: link?.url ?? "",
  };
  return {
    value: { ...value, gift: normalizedGift },
    changed: JSON.stringify(gift) !== JSON.stringify(normalizedGift),
    ...(hadUnrecognizedInput ? { notice: "旧草稿中的礼物内容无法识别，已清除，请重新填写。" } : {}),
  };
}

function normalizedDraftForStorage(draft: SenderDraft): SenderDraft {
  const normalized = normalizeStoredGift(draft);
  return normalized.value as SenderDraft;
}

function isSenderUnlockDraft(value: unknown): value is SenderUnlockDraft {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.kind === "none" ||
    value.kind === "rps" ||
    value.kind === "blow-candles"
  ) {
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
    (value.imageUrl === undefined || isString(value.imageUrl)) &&
    isRecord(value.transform) &&
    typeof value.transform.x === "number" &&
    typeof value.transform.y === "number" &&
    typeof value.transform.scale === "number"
  );
}

function isPortraitDraft(value: unknown): boolean {
  if (!isRecord(value) || !PORTRAIT_TEMPLATE_IDS.includes(value.templateId as never)) return false;
  const isPortraitImage = (part: unknown) => isString(part) && (
    part.startsWith("data:image/png;base64,") || part.startsWith("idb:portrait:")
  );
  if (!isPortraitImage(value.stickerImageUrl) || !isPortraitImage(value.posterImageUrl)) return false;
  if (!isRecord(value.transform)) return false;
  return [value.transform.centerX, value.transform.centerY, value.transform.width, value.transform.rotation]
    .every((part) => typeof part === "number" && Number.isFinite(part));
}

function hasSenderDraftShape(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || value.version !== 2) {
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
    (value.basics.birthday === undefined || isString(value.basics.birthday)) &&
    isString(value.basics.openingTemplateId) &&
    isString(value.basics.openingTitle) &&
    isString(value.basics.openingPrompt) &&
    isString(value.card.templateId) &&
    isString(value.card.message) &&
    isString(value.card.signature) &&
    isString(value.scrapbook.templateId) &&
    value.scrapbook.templateId in SCRAPBOOK_TEMPLATE_SLOT_COUNTS &&
    isString(value.scrapbook.description) &&
    Array.isArray(value.scrapbook.slots) &&
    value.scrapbook.slots.every(isScrapbookSlot) &&
    (value.gift.kind === "none" || value.gift.kind === "link") &&
    isString(value.gift.title) &&
    isString(value.gift.description) &&
    isString(value.gift.externalUrl) &&
    (value.portraitChoiceMade === undefined || typeof value.portraitChoiceMade === "boolean")
    && (value.portrait === undefined || isPortraitDraft(value.portrait))
  );
}

export function isSenderDraft(value: unknown): value is SenderDraft {
  return (
    hasSenderDraftShape(value) &&
    (value.memoryKind === "card" || value.memoryKind === "scrapbook")
  );
}

export function loadSenderDraft(
  storage: ReadableStorage,
): SenderDraftLoadResult {
  try {
    const serialized = storage.getItem(SENDER_DRAFT_STORAGE_KEY);
    if (!serialized) {
      return { status: "empty" };
    }
    const parsed: unknown = JSON.parse(serialized);
    const migrated = migrateLegacySenderDraft(parsed);
    const normalized = normalizeStoredGift(migrated);

    if (isSenderDraft(normalized.value)) {
      let notice = normalized.notice;
      if (normalized.changed && storage.setItem) {
        try {
          storage.setItem(SENDER_DRAFT_STORAGE_KEY, JSON.stringify(normalized.value));
        } catch {
          notice = "旧草稿中的礼物内容已在本次会话清除，但浏览器暂时未能更新，请重新填写后继续。";
        }
      }
      return { status: "ready", draft: normalized.value, ...(notice ? { notice } : {}) };
    }
    if (hasSenderDraftShape(normalized.value) && normalized.value.memoryKind === undefined) {
      const draft = { ...normalized.value, memoryKind: "card" } as SenderDraft;
      let notice = normalized.notice;
      if (storage.setItem) {
        try {
          storage.setItem(SENDER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch {
          notice = "旧草稿已在本次会话更新，但浏览器暂时未能保存；请继续编辑后再试。";
        }
      }
      return {
        status: "ready",
        draft,
        ...(notice ? { notice } : {}),
      };
    }
    return { status: "invalid", reason: "草稿格式已过期或不完整。" };
  } catch {
    return { status: "invalid", reason: "草稿内容无法读取。" };
  }
}

export function saveSenderDraft(
  storage: WritableStorage,
  draft: SenderDraft,
): SenderDraftSaveResult {
  try {
    storage.setItem(SENDER_DRAFT_STORAGE_KEY, JSON.stringify(normalizedDraftForStorage(draft)));
    return { ok: true };
  } catch {
    return { ok: false, reason: "浏览器空间不足，草稿暂时无法保存。" };
  }
}

export function clearSenderDraft(storage: WritableStorage): boolean {
  try {
    storage.removeItem(SENDER_DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getBrowserDraftStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
